import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent_routes import agent_router
from database import create_tables
from modules.management.routes import management_router
from modules.simulation.routes import simulation_router
from platform_routes import platform_router
from routes import rag_router
from routes import router as auth_router

load_dotenv()


def get_cors_origins():
    env_origins = os.getenv("CORS_ORIGINS", "").strip()
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]

    return [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    print("Database tables initialized")
    yield


app = FastAPI(
    title="PetraAI - Multi-Agent AI Startup Strategy Simulator API",
    description="A generative AI powered decision-support system for startup founders.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(rag_router)
app.include_router(simulation_router)
app.include_router(management_router)
app.include_router(agent_router)
app.include_router(platform_router)


@app.get("/", tags=["root"])
def read_root():
    return {
        "message": "PetraAI - Multi-Agent AI Startup Strategy Simulator API",
        "status": "running",
        "docs": "/docs",
        "version": "0.2.0",
    }


@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "service": "petra-ai-startup-simulator-api",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
