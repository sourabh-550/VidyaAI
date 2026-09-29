import os
import json
import pickle
import random
import asyncio
import logging

import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from groq import APIError, RateLimitError

from pdf_processor import extract_chunks
from embedder import build_and_save_index, search, get_model
from pruner import prune_context
from llm_client import ask_llm, client as groq_client, GROQ_MODEL

logger = logging.getLogger(__name__)

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

    # Retrieve top-20 candidates from FAISS
    try:
        candidates = search(body.question, top_k=20)
    except FileNotFoundError:
        # The index is missing: nothing was uploaded, or the server restarted and lost it
        raise HTTPException(
            status_code=404,
            detail="Your textbook isn't loaded on the server anymore. Please upload it again.",
        )

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


# ---------------- Quiz ----------------

MAX_QUIZ_QUESTIONS = 10

class QuizRequest(BaseModel):
    topic: str = ""
    # The backend enforces the same limit as the UI (5 or 10)
    num_questions: int = Field(default=10, ge=1, le=MAX_QUIZ_QUESTIONS)

class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct: str
    explanation: str
    type: str  # "mcq" or "truefalse"

class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
    topic: str

def pick_quiz_chunks(topic: str) -> list[str]:
    """Choose the study material the quiz is built from."""
    if topic:
        # A topic was given: use the passages most related to it
        try:
            results = search(topic, top_k=8)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="No PDF uploaded. Upload a PDF first.")
        chunks = [item["chunk"] for item in results]
        if chunks:
            return chunks

    # No topic (or nothing found): take a random spread from the whole document
    with open("faiss_store/chunks.pkl", "rb") as f:
        all_chunks = pickle.load(f)
    return random.sample(all_chunks, min(8, len(all_chunks)))

@app.post("/quiz", response_model=QuizResponse)
def generate_quiz(body: QuizRequest):
    if not os.path.exists("faiss_store/chunks.pkl"):
        raise HTTPException(status_code=404, detail="No PDF uploaded. Upload a PDF first.")

    topic = body.topic.strip()
    context = "\n\n".join(pick_quiz_chunks(topic))

    topic_line = f"Topic focus: {topic}" if topic else "Cover the main topics from the document."

    prompt = f"""You are a teacher creating a quiz from the following study material.

{topic_line}

Study Material:
{context}

Create exactly {body.num_questions} quiz questions. Mix MCQ and True/False questions.
Use only facts from the study material.

Rules:
- Never include the correct answer, or words that give it away, in the question text.
- The "correct" value must be copied exactly from one of the options.

Respond ONLY with a valid JSON object in this format. No markdown, no extra text.
{{
  "questions": [
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
  ]
}}"""

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            # Low reasoning effort leaves most of the token budget for the quiz itself
            reasoning_effort="low",
            max_completion_tokens=3000,
            # JSON mode: Groq makes sure the reply is a valid JSON object
            response_format={"type": "json_object"},
        )
    except RateLimitError:
        logger.warning("Groq rate limit hit while making a quiz")
        raise HTTPException(
            status_code=429,
            detail="Too many requests right now. Please wait a minute and try again.",
        )
    except APIError as e:
        logger.exception("Groq API error while making a quiz: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Couldn't make the quiz right now. Please try again.",
        )

    raw = (response.choices[0].message.content or "").strip()

    # Safety net in case the model still wraps the JSON in markdown
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Quiz reply was not valid JSON: %s", raw[:500])
        raise HTTPException(
            status_code=502,
            detail="The quiz came back incomplete. Please try again.",
        )

    # Accept both {"questions": [...]} and a plain [...] list
    items = data.get("questions", []) if isinstance(data, dict) else data
    if not isinstance(items, list):
        items = []

    questions = []
    for item in items:
        try:
            question = QuizQuestion(**item)
        except (TypeError, ValidationError):
            continue  # skip one badly formed question instead of failing the whole quiz
        if question.correct in question.options:
            questions.append(question)
        if len(questions) == body.num_questions:
            break

    if not questions:
        raise HTTPException(
            status_code=502,
            detail="Couldn't make the quiz right now. Please try again.",
        )

    return QuizResponse(
        questions=questions,
        topic=topic or "Full Document"
    )