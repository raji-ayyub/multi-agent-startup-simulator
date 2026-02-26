

"""
LLM, embedding, and MMR reranking utilities.
"""

import os
import logging
from typing import List, Optional, Tuple
import numpy as np

import openai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type




logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)






OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set")

client = openai.OpenAI(api_key=OPENAI_API_KEY)



# Retry Configuration

retry_decorator = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(
        (openai.APIConnectionError, openai.APITimeoutError, openai.RateLimitError)
    ),
    before_sleep=lambda retry_state: logger.warning(
        f"Retrying OpenAI call (attempt {retry_state.attempt_number})"
    )
)



# Embedding Function

@retry_decorator
def generate_embedding(
    text: str,
    model: str = "text-embedding-3-small"
) -> List[float]:
    """
    Generate embedding vector for given text.
    """
    try:
        response = client.embeddings.create(
            model=model,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise




def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def mmr_select(
    query_embedding: List[float],
    candidate_chunks: List[Tuple[str, List[float], str]],
    top_k: int = 5,
    lambda_param: float = 0.5
) -> List[Tuple[str, str]]:
    """
    Perform Max Marginal Relevance selection.

    candidate_chunks format:
    [
        (chunk_text, chunk_embedding, document_id),
        ...
    ]

    Returns:
    [
        (chunk_text, document_id),
        ...
    ]
    """

    query_vec = np.array(query_embedding)
    candidates = [
        (text, np.array(emb), doc_id)
        for text, emb, doc_id in candidate_chunks
    ]

    selected = []
    selected_indices = []

    # Compute similarity of each candidate to query
    similarities = [
        cosine_similarity(query_vec, emb)
        for _, emb, _ in candidates
    ]

    while len(selected) < min(top_k, len(candidates)):

        if len(selected) == 0:
            idx = int(np.argmax(similarities))
            selected.append(candidates[idx])
            selected_indices.append(idx)
            continue

        mmr_scores = []

        for i, (text_i, emb_i, doc_id_i) in enumerate(candidates):

            if i in selected_indices:
                mmr_scores.append(-1)
                continue

            relevance = cosine_similarity(query_vec, emb_i)

            diversity = max(
                cosine_similarity(emb_i, candidates[j][1])
                for j in selected_indices
            )

            mmr_score = (
                lambda_param * relevance
                - (1 - lambda_param) * diversity
            )

            mmr_scores.append(mmr_score)

        idx = int(np.argmax(mmr_scores))
        selected.append(candidates[idx])
        selected_indices.append(idx)

    return [(text, doc_id) for text, _, doc_id in selected]




@retry_decorator
def generate_answer(
    context: str,
    question: str,
    model: str = "gpt-4o-mini",
    temperature: float = 0.0,
    max_tokens: Optional[int] = None
) -> str:
    """
    Generate answer using LLM with retrieved context.
    """

    prompt = f"""
You are a helpful and precise assistant.

Use the provided context to answer the question.
Base your answer primarily on the context.
If the answer is clearly not present in the context, say:
"I cannot find the answer in the provided context."

If relevant information exists, quote or reference relevant parts.

Context:
{context}

Question:
{question}

Answer:
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You answer questions based on provided context."},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"Answer generation failed: {e}")
        raise