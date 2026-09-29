import os
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
Keep answers concise, helpful, and easy to understand.
Write in plain text with short paragraphs. Use a few simple bullet points only if they really help. Do not use tables."""

FALLBACK_ANSWER = "Sorry, I couldn't put together an answer this time. Please try asking again."


def ask_llm(query: str, context_chunks: list[str]) -> str:
    context_text = "\n\n---\n\n".join(context_chunks)

    user_message = f"""Context from the document:
{context_text}

Student's question: {query}

Answer clearly and simply:"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
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