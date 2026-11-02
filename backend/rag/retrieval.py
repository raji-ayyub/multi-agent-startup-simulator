

import os
import psycopg2
from typing import List, Tuple
from rag.model import generate_embedding, generate_embeddings

DATABASE_URL = os.environ.get("DATABASE_URL")


def retrieve_context_batch(
    questions: List[str],
    top_k: int = 2,
    document_ids: List[str] | None = None,
) -> List[List[Tuple[str, str]]]:
    """Retrieve separate top-k results for multiple questions in one embedding request."""
    if not questions:
        return []
    if document_ids is not None and not document_ids:
        return [[] for _ in questions]

    embeddings = generate_embeddings(questions)
    results: List[List[Tuple[str, str]]] = []
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            for embedding in embeddings:
                embedding_str = "[" + ",".join(map(str, embedding)) + "]"
                if document_ids is None:
                    cur.execute(
                        """
                        SELECT dc.chunk_text, dc.document_id
                        FROM public.document_chunks dc
                        JOIN public.documents d ON d.id = dc.document_id
                        WHERE d.source_type IS DISTINCT FROM 'simulation-intake'
                        ORDER BY dc.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (embedding_str, top_k),
                    )
                else:
                    cur.execute(
                        """
                        SELECT dc.chunk_text, dc.document_id
                        FROM public.document_chunks dc
                        WHERE dc.document_id::text = ANY(%s)
                        ORDER BY dc.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (document_ids, embedding_str, top_k),
                    )
                results.append(cur.fetchall())
        return results
    finally:
        conn.close()



# RAG Retriever

def retrieve_context(
    question: str,
    top_k: int = 5,
    document_ids: List[str] | None = None,
) -> List[Tuple[str, str]]:
    """
    Returns top-k chunks for a question.
    Output: List of tuples (chunk_text, document_id)
    """

    if document_ids is not None and not document_ids:
        return []

    # Generate embedding
    query_embedding = generate_embedding(question)

    # Convert embedding list -> string format required by pgvector
    # Format: '[0.123,0.456,...]'
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"


    conn = psycopg2.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            if document_ids is None:
                cur.execute(
                    """
                    SELECT dc.chunk_text, dc.document_id
                    FROM public.document_chunks dc
                    JOIN public.documents d ON d.id = dc.document_id
                    WHERE d.source_type IS DISTINCT FROM 'simulation-intake'
                    ORDER BY dc.embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (embedding_str, top_k),
                )
            else:
                cur.execute(
                    """
                    SELECT dc.chunk_text, dc.document_id
                    FROM public.document_chunks dc
                    WHERE dc.document_id::text = ANY(%s)
                    ORDER BY dc.embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (document_ids, embedding_str, top_k),
                )

            results = cur.fetchall()

        return results

    finally:
        conn.close()




def build_context(chunks: List[Tuple[str, str]]) -> str:
    """
    Combine chunks into a single context string.
    """
    return "\n\n".join([chunk[0] for chunk in chunks])
