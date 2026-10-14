# Follow-up fact check

`followup_facts.py` tests whether follow-up answers add facts that are not in the passages the model was given. Each run asks a first question with no history, then a follow-up with that answer as history. Both go through the real `/ask` endpoint. The script saves every follow-up answer together with its passages, and a person then checks each claim by reading.

## Running it

You need:

- `GROQ_API_KEY` and `COHERE_API_KEY` in `backend/.env`;
- the backend's Python packages (`pip install -r backend/requirements.txt`);
- the test document already uploaded, so `backend/faiss_store/` holds its index. The October 2026 results used the NCERT Class 10 chapter "Light – Reflection and Refraction".

From the repository root:

```text
python evals/followup_facts.py evals/results/simpler.json
python evals/followup_facts.py evals/results/example.json --followup "give me an example of that"
```

Options: `--runs` (default 5), `--question` (default "What is a convex lens?"), `--followup` (default "explain that more simply") and `--pause` (default 60 seconds between runs). Each run makes 3 Groq calls, and the pause keeps it under the free tier's per-minute limit. If the rewrite call hits that limit, it silently falls back to the original question, which changes the test. Check that every run's `search_query` is a full question.

Results are written to `evals/results/`. That folder is git-ignored, because the files contain text from the test document.

## Checking the answers

Each result has `followup_answer` and `passages`. For every claim in the answer, search the passages for its key words, then read the surrounding text. Give each claim one of three labels:

| Label | Meaning | Real examples |
| --- | --- | --- |
| **Wrong** | The claim is false, or the passages say otherwise. | A "real, inverted" image for a reading lens: the passages' table says an object between the focus and the lens gives an image that is enlarged, virtual and erect. "Objects that are far away can appear larger or closer": the passages say the image of a very distant object is "highly diminished". "Help you see things that are far away": on its own, a convex lens makes distant things blurry for a normal eye. |
| **True but extra** | The claim is true, but the passages don't say it. It came from the model's training. | A lens is made of "glass" (or "glass or plastic"): the passages never say what a lens is made of. "Like a magnifying glass or a camera lens". |
| **Fine** | The passages support it, or it is a rewording or comparison that adds no new fact. | "Like the outside of a ball", a comparison for "spherical". "Focal point" for "principal focus". "Make small things look bigger", which the passages' table supports. |

A claim that is only true inside a device or setup the answer doesn't mention counts as **wrong**, because the user takes it at face value. "Help you see things that are far away" is true inside a telescope, but the answer never mentioned one.

Count answers, not claims. An answer with at least one wrong claim counts as one wrong answer.

For the example test, also record where each example came from: **from the passages**, **said there is none**, or **made up**.

## Results, October 2026

`gpt-oss-20b`, NCERT "Light" chapter, 5 runs per test. The files are `simpler_before.json`, `simpler_after.json` and `example.json` in `evals/results/`.

- **"explain that more simply"**, 5 times before and 5 times after two prompt rules were added: use only examples from the context, and leave out anything you can't point to in the context.
  - All 10 answers said a lens is made of "glass" (sometimes "glass or plastic"). That is true, but the passages never say what a lens is made of.
  - Answers with a **wrong** claim: 1 of 5 before, 1 of 5 after.
    - Before: "objects that are far away can appear larger or closer". The passages say the image of a very distant object is "highly diminished".
    - After: "help you see things that are far away". On its own, a convex lens makes distant things blurry for a normal eye. This is only true inside a telescope, which the answer did not mention.
  - One more answer after the change added a claim that is **true but extra**: "like a magnifying glass or a camera lens".
- **"give me an example of that"**, 5 times with the new rules.
  - 4 of 5 used the document's own example: an exercise question about reading small letters in a dictionary with a convex lens of focal length 5 cm. The passages only ask the question, so the model also worked out the answer. It picked the right one.
  - 1 of 5 made up its own example: a magnifying glass held over a book "or a seed".
  - 2 of 5 added a **wrong** fact: that the image you see when reading through the lens is "real" and "inverted". The passages' own table says an object between the focus and the lens gives an image that is enlarged, virtual and erect.

**In total, 4 of the 15 follow-up answers stated a wrong fact.** The wrong facts came from two different causes:

- **Outside knowledge.** "Objects that are far away can appear larger or closer" and "help you see things that are far away" are not in the passages at all. The model brought them in from its training.
- **Mixing up two parts of the passages.** Both wrong examples gave a reading lens the "real, inverted" image from the candle-and-screen activity. Each piece is in the passages; the mistake is in putting them together.

**Citations**, where the model names the passage behind each fact, would make the first kind visible: a fact with no passage to point to would stand out. They would not catch the second kind, because each piece really does come from a passage.

**What this shows:** the prompt wording did not reduce the added facts. The model still reaches for facts and examples it knows from training. Most are true but extra. A few are wrong, and a wrong fact is worse than a missing one, because the user cannot tell that it did not come from the document. Five runs per test is a small sample, so these counts show that the problem exists, not exactly how often it happens.
