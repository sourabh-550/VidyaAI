"""Follow-up fact check: does a follow-up answer add facts that are not in its passages?

Each run asks a first question with no history, then a follow-up with that
answer as history, both through the real /ask endpoint (Cohere and Groq are
called for real). Every follow-up answer is saved together with the passages
it was given, so each claim can be checked against them by reading.

Needs: GROQ_API_KEY and COHERE_API_KEY in backend/.env, and the test document
already uploaded, so backend/faiss_store/ holds its index. The October 2026
results used the NCERT Class 10 chapter "Light - Reflection and Refraction".

Usage (from the repository root, with the backend's Python):
    python evals/followup_facts.py evals/results/simpler.json
    python evals/followup_facts.py evals/results/example.json --followup "give me an example of that"

Results go in evals/results/, which is git-ignored because it holds document text.
"""
import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"

parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
parser.add_argument("out", help="where to write the results (JSON)")
parser.add_argument("--runs", type=int, default=5)
parser.add_argument("--question", default="What is a convex lens?")
parser.add_argument("--followup", default="explain that more simply")
# Each run makes 3 Groq calls. The pause keeps a run under the free tier's
# tokens-per-minute limit; a rate-limited rewrite would silently fall back.
parser.add_argument("--pause", type=int, default=60, help="seconds between runs")
args = parser.parse_args()
out_path = Path(args.out).resolve()
out_path.parent.mkdir(parents=True, exist_ok=True)

# The backend finds faiss_store/ and .env relative to the current folder
os.chdir(BACKEND)
sys.path.insert(0, str(BACKEND))
logging.basicConfig(level=logging.WARNING)

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

api = TestClient(main.app)
results = []

for i in range(args.runs):
    if i:
        time.sleep(args.pause)
    first = api.post("/ask", json={"question": args.question})
    first_answer = first.json()["answer"]
    history = [
        {"role": "user", "content": args.question},
        {"role": "assistant", "content": first_answer},
    ]
    followup = api.post("/ask", json={"question": args.followup, "history": history})
    data = followup.json()
    results.append({
        "run": i + 1,
        "status": [first.status_code, followup.status_code],
        "question": args.question,
        "first_answer": first_answer,
        "followup": args.followup,
        "search_query": data.get("search_query"),
        "followup_answer": data.get("answer"),
        "passages": [s["chunk"] for s in data.get("sources", [])],
    })
    print(f"run {i + 1}: status {first.status_code}/{followup.status_code}, "
          f"search_query={data.get('search_query')!r}", flush=True)
    # Written after every run, so a crash or rate limit keeps the runs so far
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"done: {out_path}")
