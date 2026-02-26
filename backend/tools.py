
import os
import logging
from typing import List, Dict, Tuple, Optional, Any
import json

import psycopg2
import psycopg2.pool
import numpy as np
import openai
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIG & CLIENTS
# ============================================================================

DATABASE_URL = os.environ.get("DATABASE_URL")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
# SEARCH_API_KEY = os.environ.get("SEARCH_API_KEY", "")  # optional

openai_client = None

def _get_openai_client():
    """Lazily initialize OpenAI client."""
    global openai_client
    if openai_client is None:
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
    return openai_client

# Pool for efficient DB connections
db_pool = None
try:
    db_pool = psycopg2.pool.SimpleConnectionPool(1, 20, DATABASE_URL)
    logger.info("✓ Database pool initialized")
except Exception as e:
    logger.error(f"Pool creation failed: {e}")


# ============================================================================
# HELPER: DB CONNECTION
# ============================================================================

def get_db():
    """Get a connection from the pool."""
    if not db_pool:
        raise RuntimeError("Database pool not initialized")
    return db_pool.getconn()


def release_db(conn, close=False):
    """Release connection back to pool."""
    if db_pool and conn:
        db_pool.putconn(conn, close=close)


# ============================================================================
# EMBEDDING & SIMILARITY
# ============================================================================

def generate_embedding(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """Generate OpenAI embedding."""
    try:
        client = _get_openai_client()
        response = client.embeddings.create(model=model, input=text)
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12)


# ============================================================================
# RETRIEVAL TOOLS
# ============================================================================

def retrieve_docs(
    query: str,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve top-k documents vector store.

    Args:
        query: Search query text
        top_k: Number of results to return
        filters: Optional dict with 'document_type', 'user_id', etc.

    Returns:
        List of dicts with keys: chunk_text, document_id, similarity, source, metadata
    """
    if not db_pool:
        logger.error("Database not initialized")
        return []

    try:
        embedding = generate_embedding(query)
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        conn = get_db()
        results = []
        try:
            with conn.cursor() as cur:
                # Build WHERE clause if filters provided
                where_clause = ""
                params = [embedding_str, top_k]

                if filters:
                    conditions = []
                    # param_idx = 3
                    for key, val in filters.items():
                        if key == "document_type":
                            conditions.append(f"dc.document_type = %s")
                        elif key == "user_id":
                            conditions.append(f"dc.user_id = %s")
                        elif key == "source":
                            conditions.append(f"dc.source ILIKE %s")
                        if conditions:
                            params.append(val)
                    if conditions:
                        where_clause = "WHERE " + " AND ".join(conditions)

                query_sql = f"""
                    SELECT
                        dc.chunk_text::text,
                        dc.document_id::text,
                        1 - (dc.embedding <=> %s::vector) as similarity,
                        dc.source::text,
                        dc.metadata
                    FROM public.document_chunks dc
                    {where_clause}
                    ORDER BY dc.embedding <=> %s::vector
                    LIMIT %s
                """
                cur.execute(query_sql, params)
                rows = cur.fetchall()

                for row in rows:
                    results.append({
                        "chunk_text": row[0],
                        "document_id": row[1],
                        "similarity": float(row[2]),
                        "source": row[3],
                        "metadata": row[4] or {}
                    })
        finally:
            release_db(conn)

        logger.info(f"Retrieved {len(results)} docs for query: {query[:50]}...")
        return results

    except Exception as e:
        logger.error(f"Retrieval failed: {e}")
        return []


def rerank_with_mmr(
    query: str,
    candidates: List[Dict[str, Any]],
    top_k: int = 5,
    lambda_param: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Rerank candidates using Max Marginal Relevance (diversity + relevance).

    Args:
        query: Original search query
        candidates: List of retrieved candidates from retrieve_docs()
        top_k: Final number to return
        lambda_param: Balance between relevance (1.0) and diversity (0.0)

    Returns:
        Reranked, diverse subset of candidates
    """
    if len(candidates) <= top_k:
        return candidates

    try:
        # Get query embedding
        query_emb = np.array(generate_embedding(query))

        # Get candidate embeddings (reuse stored similarity as proxy)
        selected = []
        remaining_indices = set(range(len(candidates)))

        # Greedy MMR selection
        for _ in range(min(top_k, len(candidates))):
            best_idx = None
            best_score = -float('inf')

            for idx in remaining_indices:
                cand = candidates[idx]
                relevance = cand.get("similarity", 0.0)

                # Diversity: min distance to already selected
                diversity = 0.0
                if selected:
                    # Use stored similarity as diversity proxy
                    diversity = min([candidates[sel_idx].get("similarity", 0.0) for sel_idx in selected])

                mmr_score = lambda_param * relevance - (1 - lambda_param) * diversity
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx

            if best_idx is not None:
                selected.append(best_idx)
                remaining_indices.remove(best_idx)

        return [candidates[i] for i in selected]

    except Exception as e:
        logger.error(f"MMR reranking failed: {e}")
        return candidates[:top_k]


# ============================================================================
# GENERATION TOOLS
# ============================================================================

def generate_answer(
    query: str,
    context: str,
    system_prompt: Optional[str] = None,
    model: str = "gpt-4o-mini"
) -> str:
    """
    Generate an LLM answer given query + retrieved context.

    Args:
        query: User question
        context: Retrieved context (from retrieve_docs + build_context)
        system_prompt: Custom system prompt (or uses default RAG prompt)
        model: OpenAI model name

    Returns:
        Generated answer text
    """
    if not system_prompt:
        system_prompt = """You are a helpful startup advisor AI.
Use the provided context to answer questions accurately. If the context doesn't contain
the answer, say "I don't have enough information" rather than guessing."""

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
            ],
            temperature=0.7,
            max_tokens=1024
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Answer generation failed: {e}")
        return f"Error generating answer: {str(e)}"


# # ============================================================================
# # WEB SEARCH (OPTIONAL)
# # ============================================================================

# def search_web(query: str, max_results: int = 5) -> List[Dict[str, str]]:
#     """
#     Retrieve real-time web results (requires SEARCH_API_KEY).
#     Stub implementation—integrate with SearchAPI or similar.

#     Args:
#         query: Search query
#         max_results: Max results to return

#     Returns:
#         List of dicts with 'title', 'snippet', 'url'
#     """
#     if not SEARCH_API_KEY:
#         logger.warning("SEARCH_API_KEY not set; web search unavailable")
#         return []

#     try:
#         # Example: use requests + searchapi.io or similar
#         # This is a placeholder—integrate your actual web search API
#         logger.warning("Web search not yet configured")
#         return []
#     except Exception as e:
#         logger.error(f"Web search failed: {e}")
#         return []


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def build_context(chunks: List[Dict[str, Any]]) -> str:
    """
    Combine retrieved chunks into a single context string.

    Args:
        chunks: List from retrieve_docs()

    Returns:
        Formatted context string
    """
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source", "Unknown")
        text = chunk.get("chunk_text", "")
        sim = chunk.get("similarity", 0.0)
        source_str = f"[{i}. {source} (similarity: {sim:.2f})]"
        context_parts.append(f"{source_str}\n{text}")
    return "\n\n---\n\n".join(context_parts)


def rag_pipeline(
    query: str,
    top_k: int = 5,
    use_mmr: bool = True,
    filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Complete RAG pipeline: retrieve → rerank → generate.

    Args:
        query: User question
        top_k: Number of docs to retrieve
        use_mmr: Whether to apply MMR reranking
        filters: Optional retrieval filters

    Returns:
        Dict with 'answer', 'sources', 'context'
    """
    try:
        # 1. Retrieve
        docs = retrieve_docs(query, top_k=top_k, filters=filters)
        if not docs:
            return {
                "answer": "No relevant documents found.",
                "sources": [],
                "context": ""
            }

        # 2. Rerank (optional)
        if use_mmr:
            docs = rerank_with_mmr(query, docs, top_k=min(5, top_k))

        # 3. Build context
        context = build_context(docs)

        # 4. Generate
        answer = generate_answer(query, context)

        return {
            "answer": answer,
            "sources": [doc["source"] for doc in docs],
            "context": context,
            "num_docs": len(docs)
        }

    except Exception as e:
        logger.error(f"RAG pipeline failed: {e}")
        return {
            "answer": f"Error: {str(e)}",
            "sources": [],
            "context": "",
            "num_docs": 0
        }


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "retrieve_docs",
    "rerank_with_mmr",
    "generate_answer",
    "search_web",
    "build_context",
    "rag_pipeline",
    "generate_embedding",
    "cosine_similarity",
]
