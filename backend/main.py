import asyncio
import logging
from typing import Literal

import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from pdf_processor import extract_chunks
from embedder import build_and_save_index, search, get_model
from pruner import prune_context
from llm_client import ask_llm, rewrite_query

# Without this, logger.info() lines (like the query rewrite log) are not shown
logging.basicConfig(level=logging.INFO)
# httpx logs every outgoing request at INFO; keep only its warnings
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Tutor - RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Limits for the chat history the browser sends. The frontend sends the last
# 3 question/answer pairs, but the server enforces its own cap anyway.
MAX_HISTORY_MESSAGES = 6
MAX_HISTORY_CHARS = 1500

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

    @field_validator("content")
    @classmethod
    def trim_content(cls, content: str) -> str:
        # A long earlier answer shouldn't make every later prompt huge
        return content.strip()[:MAX_HISTORY_CHARS]

class QuestionRequest(BaseModel):
    question: str
    top_k: int = 5
    similarity_threshold: float = 0.25
    # Anything longer than this is not a real chat, so it's rejected with a 422
    history: list[ChatMessage] = Field(default=[], max_length=20)

    @field_validator("history")
    @classmethod
    def clean_history(cls, history: list[ChatMessage]) -> list[ChatMessage]:
        # Empty messages carry nothing useful (content is already stripped)
        history = [m for m in history if m.content]
        history = history[-MAX_HISTORY_MESSAGES:]
        # Cutting can leave an answer without its question; start with the student
        while history and history[0].role == "assistant":
            history = history[1:]
        return history

class QuestionResponse(BaseModel):
    answer: str
    sources: list[dict]
    total_candidates: int
    pruned_count: int
    search_query: str

@app.on_event("startup")
async def startup():
    print("VidyaAI backend ready")

@app.get("/")
def health():
    return {"status": "ok", "message": "AI Tutor API running"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    chunks = extract_chunks(file_bytes)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    num_chunks = build_and_save_index(chunks)

    return {
        "message": "PDF processed successfully",
        "filename": file.filename,
        "chunks_created": num_chunks
    }

@app.post("/ask", response_model=QuestionResponse)
def ask_question(body: QuestionRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Turn a follow-up like "explain that more simply" into a standalone question.
    # With no history this returns body.question without calling Groq.
    history = [m.model_dump() for m in body.history]
    search_query = rewrite_query(body.question, history)

    # Retrieve top-20 candidates from FAISS
    try:
        candidates = search(search_query, top_k=20)
    except FileNotFoundError:
        # The index is missing: nothing was uploaded, or the server restarted and lost it
        raise HTTPException(
            status_code=404,
            detail="Your textbook isn't loaded on the server anymore. Please upload it again.",
        )

    total_candidates = len(candidates)

    # Apply context pruning
    pruned = prune_context(
        query=search_query,
        candidates=candidates,
        similarity_threshold=body.similarity_threshold,
        top_k=body.top_k
    )

    # Build context list for LLM
    context_texts = [item["chunk"] for item in pruned]

    # The answer call only needs the last question and its answer to know what
    # "that" or "it" means. Anything that isn't a clean pair is left out.
    last_exchange = history[-2:]
    if [m["role"] for m in last_exchange] != ["user", "assistant"]:
        last_exchange = []

    # Call Groq LLM
    answer = ask_llm(body.question, context_texts, last_exchange, search_query)

    # Prepare source info for frontend (full passage text + similarity score)
    sources = [
        {
            "chunk": item["chunk"],
            "similarity_score": round(item["score"], 4),
        }
        for item in pruned
    ]

    return QuestionResponse(
        answer=answer,
        sources=sources,
        total_candidates=total_candidates,
        pruned_count=len(pruned),
        search_query=search_query,
    )

async def self_ping():
    """Ping self every 10 minutes to prevent Render free tier sleep."""
    await asyncio.sleep(60)  # wait 1 min after startup
    while True:
        try:
            async with httpx.AsyncClient() as client:
                await client.get("https://vidya-ai-backend.onrender.com")
                print("Self-ping successful")
        except Exception as e:
            print(f"Self-ping failed: {e}")
        await asyncio.sleep(600)  # ping every 10 minutes

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(self_ping())
