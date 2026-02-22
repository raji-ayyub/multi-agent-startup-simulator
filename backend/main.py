import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import create_tables
from routes import router as auth_router

load_dotenv()

app = FastAPI(
    title="PetraAI - Multi-Agent AI Startup Strategy Simulator API",
    description="A generative AI–powered decision-support system for startup founders",
    version="0.1.0",
)

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Create database tables on server startup."""
    create_tables()
    print("✓ Database tables initialized")


# Include routes
app.include_router(auth_router)


@app.get("/", tags=["root"])
def read_root():
    """Root endpoint - API is running."""
    return {
        "message": "PetraAI - Multi-Agent AI Startup Strategy Simulator API",
        "status": "running",
        "docs": "/docs",
        "version": "0.1.0",
    }


@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "petra-ai-startup-simulator-api",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
