import os
import time
import logging

from dotenv import load_dotenv
from fastapi import HTTPException
from groq import Groq, APIError, RateLimitError

load_dotenv()

logger = logging.getLogger(__name__)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# The model name comes from an environment variable. Next time Groq retires
# a model, you only change GROQ_MODEL on Render. No code change needed.
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

SYSTEM_PROMPT = """You are an AI tutor for students in rural India.
Explain concepts clearly and simply. Use the provided context only.
If the answer is not in the context, say "I don't have enough information to answer this."
Base every fact and reason on the context. Don't add facts or reasons that aren't in it.
Use the earlier chat only to understand what the student is referring to. Every fact must still come from the context.
When you mention where information comes from, call it "your textbook". Never say "the context" or "the passages" to the student.
Keep answers concise, helpful, and easy to understand.
Use short paragraphs. You may use **bold** and simple bullet lists when they help. Do not use tables or headings.
Never use LaTeX. Write formulas in plain text, for example: 1/v + 1/u = 1/f or P = 1/f."""

FALLBACK_ANSWER = "Sorry, I couldn't put together an answer this time. Please try asking again."

REWRITE_PROMPT = """You turn a student's latest question into a standalone question for searching their textbook.
If the latest question already makes sense on its own, return it exactly as it is.
If it refers to the earlier chat (for example "that", "it", "explain more simply"), replace those words with the topic they refer to.
If the student moves to a new topic, rewrite only the new question. Do not mix in the earlier topic.
Never answer the question. Never add facts, explanations or extra details.
Reply with only the rewritten question on a single line, with no quotes or labels."""

# Only the start of each earlier answer is needed to see what it was about
REWRITE_ANSWER_CHARS = 500
# A reply longer than this is an answer or an explanation, not a question
REWRITE_MAX_CHARS = 500


def rewrite_query(question: str, history: list[dict]) -> str:
    """Turn a follow-up like "explain that more simply" into a question that
    makes sense on its own, so the textbook search finds the right passages.
    Any problem falls back to the original question."""
    if not history:
        return question

    lines = []
    for message in history:
        if message["role"] == "user":
            lines.append(f"Student: {message['content']}")
        else:
            lines.append(f"Tutor: {message['content'][:REWRITE_ANSWER_CHARS]}")
    chat_text = "\n".join(lines)

    user_message = f"""Earlier chat:
{chat_text}

Latest question: {question}

Standalone question:"""

    started = time.perf_counter()
    try:
        # No retries and a short timeout: a rate limit or a slow reply falls back
        # to the original question at once instead of delaying the answer
        response = client.with_options(max_retries=0, timeout=5.0).chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": REWRITE_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0,
            # The hidden reasoning comes out of this budget too. 300 leaves
            # room for low-effort thinking plus a one-line question.
            reasoning_effort="low",
            max_completion_tokens=300,
        )
        rewritten = (response.choices[0].message.content or "").strip()
    except Exception:
        # The rewrite only helps the search. It must never break the answer.
        logger.exception(
            "Query rewrite failed after %.2fs, using the original question",
            time.perf_counter() - started,
        )
        return question
    elapsed = time.perf_counter() - started

    # Keep the first line and drop quotes the model may add anyway
    rewritten = rewritten.splitlines()[0].strip().strip('"') if rewritten else ""
    if not rewritten or len(rewritten) > REWRITE_MAX_CHARS:
        logger.warning("Query rewrite unusable (%.2fs): %r -> %r", elapsed, question, rewritten)
        return question

    logger.info("Query rewrite (%.2fs): %r -> %r", elapsed, question, rewritten)
    return rewritten


def ask_llm(
    query: str,
    context_chunks: list[str],
    history: list[dict] | None = None,
    search_query: str | None = None,
) -> str:
    context_text = "\n\n---\n\n".join(context_chunks)

    # When the rewrite changed the question, show the model what it was taken to mean
    full_question = ""
    if search_query and search_query.strip() != query.strip():
        full_question = f"\n(Full question: {search_query})"

    user_message = f"""Context from the document:
{context_text}

Student's question: {query}{full_question}

Answer clearly and simply:"""

    # Earlier chat goes in as real messages, before the passages and the new question
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += history or []
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            # gpt-oss is a reasoning model: it "thinks" before it answers, and
            # that thinking uses tokens from this same budget. Low effort keeps
            # it fast, and the bigger budget leaves room for the actual answer.
            reasoning_effort="low",
            max_completion_tokens=1024,
        )
    except RateLimitError:
        logger.warning("Groq rate limit hit")
        raise HTTPException(
            status_code=429,
            detail="Too many questions right now. Please wait a minute and try again.",
        )
    except APIError as e:
        logger.exception("Groq API error: %s", e)
        raise HTTPException(
            status_code=502,
            detail="The AI service is not responding right now. Please try again.",
        )

    answer = response.choices[0].message.content
    if not answer or not answer.strip():
        logger.warning("Groq returned an empty answer")
        return FALLBACK_ANSWER

    return answer.strip()