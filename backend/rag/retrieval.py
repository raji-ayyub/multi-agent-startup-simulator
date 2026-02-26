

import os
import psycopg2
from typing import List, Tuple
from rag.model import generate_embedding

DATABASE_URL = os.environ.get("DATABASE_URL")



# RAG Retriever

def retrieve_context(question: str, top_k: int = 5) -> List[Tuple[str, str]]:
    """
    Returns top-k chunks for a question.
    Output: List of tuples (chunk_text, document_id)
    """

    # Generate embedding
    query_embedding = generate_embedding(question)

    # Convert embedding list -> string format required by pgvector
    # Format: '[0.123,0.456,...]'
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"


    conn = psycopg2.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT chunk_text, document_id
                FROM public.document_chunks
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (embedding_str, top_k)
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