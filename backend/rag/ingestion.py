# backend/rag/ingestions.py 

import os
import logging
import time
from pathlib import Path
from typing import List, Tuple


from supabase import create_client, Client
import psycopg2
from psycopg2 import pool, DatabaseError, OperationalError
from psycopg2.extras import execute_values
import openai
import pdfplumber



try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logging.warning("LangChain not installed. Falling back to basic word-based splitting.")





# Retry library
try:
    from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator




logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)




SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, DATABASE_URL, OPENAI_API_KEY]):
    raise ValueError("Missing required environment variables")

# Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# OpenAI client
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)


# Enhance DATABASE_URL with keepalive parameters to prevent connection drops
if "?" in DATABASE_URL:
    DATABASE_URL += "&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5&connect_timeout=10"
else:
    DATABASE_URL += "?keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5&connect_timeout=10"



# PostgreSQL connection pool
try:
    connection_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20, DATABASE_URL  # min 1, max 20 connections
    )
    logger.info("Database connection pool created")
except Exception as e:
    logger.error(f"Failed to create connection pool: {e}")
    raise



# Utility Functions

def get_db_connection():
    """
    Get a connection from the pool and verify it's alive.
    If the connection is broken, discard it and try again up to 3 times.
    """
    max_attempts = 3
    for attempt in range(max_attempts):
        conn = None
        try:
            conn = connection_pool.getconn()
            
            # simple query test to verify connection
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
            return conn
        
        except (DatabaseError, OperationalError) as e:
            logger.warning(f"Database connection test failed (attempt {attempt+1}/{max_attempts}): {e}")
            
            
            if conn:
                # Release the broken connection and have the pool discard it
                connection_pool.putconn(conn, close=True)
            
            if attempt == max_attempts - 1:
                logger.error("Max attempts reached, could not get a valid database connection")
                raise
            
            # Exponential backoff before retry
            time.sleep(0.5 * (2 ** attempt))
    
    raise Exception("Failed to obtain a valid database connection")





def release_db_connection(conn, close=False):
    """
    Release connection back to pool.
    If close=True, the connection will be closed instead of being returned to the pool.
    """
    if conn:
        try:
            connection_pool.putconn(conn, close=close)
        except Exception as e:
            logger.error(f"Error releasing DB connection: {e}")


def validate_file(file_path: str, max_size_mb: int = 100) -> Tuple[bool, str]:
    """
    Validate file existence, size, and extension.
    Returns (is_valid, error_message).
    """
    path = Path(file_path)
    if not path.exists():
        return False, f"File not found: {file_path}"
    
    file_size_mb = path.stat().st_size / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return False, f"File size {file_size_mb:.2f} MB exceeds limit of {max_size_mb} MB"
    
    allowed_extensions = {'.pdf', '.txt', '.md'}
    if path.suffix.lower() not in allowed_extensions:
        return False, f"Unsupported file type: {path.suffix}. Allowed: {allowed_extensions}"
    
    return True, ""


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using pdfplumber."""
    text_pages = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_pages.append(page_text)
        return " ".join(text_pages)
    except Exception as e:
        logger.error(f"PDF extraction failed for {file_path}: {e}")
        raise


def extract_text_from_txt_md(file_path: str) -> str:
    """Extract text from a plain text or markdown file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Text file extraction failed for {file_path}: {e}")
        raise


def extract_text(file_path: str) -> str:
    """
    Extract text based on file extension.
    Uses pdfplumber for PDFs, simple read for .txt/.md.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == '.pdf':
        text = extract_text_from_pdf(file_path)
    else:  # .txt or .md
        text = extract_text_from_txt_md(file_path)
    
    # Normalize whitespace
    text = " ".join(text.split())
    return text


def chunk_text_semantic(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Split text into semantically coherent chunks.
    Uses LangChain's RecursiveCharacterTextSplitter if available, else a simple word-based splitter.
    """
    if LANGCHAIN_AVAILABLE:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            length_function=len,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
        )
        return splitter.split_text(text)
    else:
        # Fallback: basic word-level splitting with overlap
        words = text.split()
        chunks = []
        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            start = end - overlap
        return chunks



# Retry decorator for OpenAI API calls (using new error types)
if TENACITY_AVAILABLE:
    retry_decorator = retry(

        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),

        retry=retry_if_exception_type(
            (openai.APIConnectionError, openai.APITimeoutError, openai.RateLimitError)
        ),

        before_sleep=lambda retry_state: logger.warning(
            f"Retrying OpenAI API call (attempt {retry_state.attempt_number})"
        )
    )

else:
    retry_decorator = lambda func: func



@retry_decorator
def generate_embeddings_batch(texts: List[str], batch_size: int = 100) -> List[List[float]]:
    """
    Generate embeddings for a list of texts in batches using the new OpenAI client.
    """
    all_embeddings = []

    for i in range(0, len(texts), batch_size):

        batch = texts[i:i+batch_size]

        try:
            response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=batch
            )

            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)
            logger.debug(f"Generated embeddings for batch {i//batch_size + 1}")
        
        except Exception as e:
            logger.error(f"OpenAI embedding error for batch: {e}")
            raise

    return all_embeddings



def upload_to_storage(local_file_path: str, source_type: str) -> str:
    """
    Upload file to Supabase Storage and return the storage path.
    """
    bucket = "documents"
    file_name = Path(local_file_path).name
    storage_path = f"{source_type}/{file_name}"

    with open(local_file_path, "rb") as f:
        data = f.read()

    try:
        supabase.storage.from_(bucket).upload(storage_path, data)
    except Exception as e:
        logger.error(f"Supabase upload error: {e}")
        raise Exception(f"Supabase upload failed: {e}")

    logger.info(f"File uploaded to storage: {bucket}/{storage_path}")
    return f"{bucket}/{storage_path}"






# Main Ingestion Function

def ingest_document(local_file_path: str, title: str, source_type: str = "pdf") -> str:
    """
    Full ingestion pipeline with robust database connection handling.
    """
    start_time = time.time()
    conn = None
    cur = None

    try:
        
        is_valid, error_msg = validate_file(local_file_path)

        if not is_valid:
            raise ValueError(error_msg)

        
        storage_path = upload_to_storage(local_file_path, source_type)

       
        conn = get_db_connection()  # now returns a tested connection
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO documents (title, file_path, source_type)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (title, storage_path, source_type)
        )

        document_id = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Document metadata inserted with ID: {document_id}")

       
        text = extract_text(local_file_path)
        logger.info(f"Text extracted, length: {len(text)} characters")

       
        chunks = chunk_text_semantic(text)
        logger.info(f"Text split into {len(chunks)} chunks")

        
        embeddings = generate_embeddings_batch(chunks)
        logger.info(f"Generated {len(embeddings)} embeddings")

        
        chunk_records = [
            (document_id, chunk, embedding, idx)
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        # Insert chunks
        execute_values(
            cur,
            """
            INSERT INTO document_chunks (document_id, chunk_text, embedding, chunk_index)
            VALUES %s
            """,
            chunk_records
        )
        conn.commit()
        logger.info(f"Inserted {len(chunk_records)} chunks into database")

        elapsed = time.time() - start_time
        return (f"Document '{title}' ingested successfully. "
                f"ID: {document_id}, Chunks: {len(chunks)}, Time: {elapsed:.2f}s")

    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        if conn:
            conn.rollback()
        raise

    finally:
        if cur:
            cur.close()
        if conn:
            release_db_connection(conn)  # return healthy connection to pool
        logger.debug("Database connection released")






# Example Usage
if __name__ == "__main__":
    
    result = ingest_document(
        "documents/pricing/saas_pricing_guide.pdf",
        "SaaS Pricing Guide",
        "pdf"
    )
    print(result)