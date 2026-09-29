import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import httpx

from pdf_processor import extract_chunks
from embedder import build_and_save_index, search, get_model
from pruner import prune_context
from llm_client import ask_llm

app = FastAPI(title="AI Tutor - RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str
    top_k: int = 5
    similarity_threshold: float = 0.25

class QuestionResponse(BaseModel):
    answer: str
    sources: list[dict]
    total_candidates: int
    pruned_count: int

@app.on_event("startup")
async def startup():
    print("VidyaAI backend ready - using Groq API for embeddings!")

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
    
    # Retrieve top-20 candidates from FAISS
    try:
        candidates = search(body.question, top_k=20)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    total_candidates = len(candidates)
    
    # Apply context pruning
    pruned = prune_context(
        query=body.question,
        candidates=candidates,
        similarity_threshold=body.similarity_threshold,
        top_k=body.top_k
    )
    
    # Build context list for LLM
    context_texts = [item["chunk"] for item in pruned]
    
    # Call Groq LLM
    answer = ask_llm(body.question, context_texts)
    
    # Prepare source info for frontend
    sources = [
        {
            "chunk": item["chunk"][:200] + "..." if len(item["chunk"]) > 200 else item["chunk"],
            "similarity_score": round(item["score"], 4),
            "rerank_score": round(item.get("rerank_score", 0), 4)
        }
        for item in pruned
    ]
    
    return QuestionResponse(
        answer=answer,
        sources=sources,
        total_candidates=total_candidates,
        pruned_count=len(pruned)
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



class QuizRequest(BaseModel):
    topic: str = ""
    num_questions: int = 10

class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct: str
    explanation: str
    type: str  # "mcq" or "truefalse"

class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
    topic: str

@app.post("/quiz", response_model=QuizResponse)
def generate_quiz(body: QuizRequest):
    if not os.path.exists("faiss_store/chunks.pkl"):
        raise HTTPException(status_code=404, detail="No PDF uploaded. Upload a PDF first.")

    import pickle
    with open("faiss_store/chunks.pkl", "rb") as f:
        chunks = pickle.load(f)

    # Pick representative chunks
    import random
    sample_chunks = random.sample(chunks, min(8, len(chunks)))
    context = "\n\n".join(sample_chunks)

    topic_line = f"Topic focus: {body.topic}" if body.topic else "Cover the main topics from the document."

    prompt = f"""You are a teacher creating a quiz from the following study material.

{topic_line}

Study Material:
{context}

Create exactly {body.num_questions} quiz questions. Mix MCQ and True/False questions.

Respond ONLY with a valid JSON array. No explanation, no markdown, no extra text.
Format:
[
  {{
    "type": "mcq",
    "question": "Question text here?",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct": "A) option1",
    "explanation": "Brief explanation why this is correct."
  }},
  {{
    "type": "truefalse",
    "question": "Statement here.",
    "options": ["True", "False"],
    "correct": "True",
    "explanation": "Brief explanation."
  }}
]"""

    from groq import Groq
    from dotenv import load_dotenv
    load_dotenv()
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=2000
    )

    import json
    raw = response.choices[0].message.content.strip()

    # Clean markdown if present
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()

    questions_data = json.loads(raw)

    questions = [QuizQuestion(**q) for q in questions_data[:body.num_questions]]

    return QuizResponse(
        questions=questions,
        topic=body.topic or "Full Document"
    )