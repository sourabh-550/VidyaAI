def prune_context(
    query: str,
    candidates: list[dict],
    similarity_threshold: float = 0.25,
    top_k: int = 5
) -> list[dict]:
    """
    Lightweight 2-stage context pruning (no reranker model, to fit Render's free tier):
    1. Drop candidates whose similarity score is below the threshold
    2. Keep the top_k highest-scoring candidates that remain

    If nothing passes the threshold (common for broad questions like
    "summarize this"), fall back to the 3 best candidates so the LLM
    always gets some context.

    `query` isn't used yet; a future reranking step would use it.
    """
    # Stage 1: threshold filter
    filtered = [c for c in candidates if c["score"] >= similarity_threshold]

    if not filtered:
        filtered = sorted(candidates, key=lambda c: c["score"], reverse=True)[:3]

    # Stage 2: keep the top_k by similarity score
    ranked = sorted(filtered, key=lambda c: c["score"], reverse=True)

    return ranked[:top_k]