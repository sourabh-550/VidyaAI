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
- **After the DocsMind rename** (new prompts, same test, 5 runs, `simpler_docsmind.json`): 1 of 5 answers had a **wrong** claim ("objects that are far away can appear larger and closer"), 1 of 5 added a **true but extra** one ("magnifying glasses and cameras"), and 3 of 5 said a lens is made of "glass". That is no worse than before the rename.
- **"give me an example of that"**, 5 times with the new rules.
  - 4 of 5 used the document's own example: an exercise question about reading small letters in a dictionary with a convex lens of focal length 5 cm. The passages only ask the question, so the model also worked out the answer. It picked the right one.
  - 1 of 5 made up its own example: a magnifying glass held over a book "or a seed".
  - 2 of 5 added a **wrong** fact: that the image you see when reading through the lens is "real" and "inverted". The passages' own table says an object between the focus and the lens gives an image that is enlarged, virtual and erect.

**In total, 4 of the 15 follow-up answers stated a wrong fact.** The wrong facts came from two different causes:

- **Outside knowledge.** "Objects that are far away can appear larger or closer" and "help you see things that are far away" are not in the passages at all. The model brought them in from its training.
- **Mixing up two parts of the passages.** Both wrong examples gave a reading lens the "real, inverted" image from the candle-and-screen activity. Each piece is in the passages; the mistake is in putting them together.

**Citations**, where the model names the passage behind each fact, would make the first kind visible: a fact with no passage to point to would stand out. They would not catch the second kind, because each piece really does come from a passage.

**What this shows:** the prompt wording did not reduce the added facts. The model still reaches for facts and examples it knows from training. Most are true but extra. A few are wrong, and a wrong fact is worse than a missing one, because the user cannot tell that it did not come from the document. Five runs per test is a small sample, so these counts show that the problem exists, not exactly how often it happens.

## Re-explanation rule, October 2026

In the app, "explain it in easy language" gave almost the same answer as before, because the old rule only named "simpler". The new rule in `SYSTEM_PROMPT` treats any request for an easier explanation as asking for a simpler one, whatever the wording. It says to keep only the key terms the user needs and explain each one in everyday words, and not to add terms or details. It also says the answer must be shorter.

Test: "What is a convex lens?", then a follow-up, 3 runs per phrasing (`phr_*.json` = old rule, `phr_*_after.json` = new rule). The first three phrasings are examples written into the new rule. The last two are not, to check that the rule works for other wording.

An answer passes when it meets the length criterion, drops or explains in everyday words both "spherical" and "converges", and has no **wrong** claim. Words are counted in both answers the same way.

| Follow-up | Old rule: shorter | Old rule: ≤ 20% longer | New rule: shorter | New rule: ≤ 20% longer |
| --- | --- | --- | --- | --- |
| "explain it in easy language" | 0/3 | 0/3 | 1/3 | 1/3 |
| "say it in simple words" | 1/3 | 1/3 | 0/3 | 1/3 |
| "I didn't understand that" | 0/3 | 0/3 | 1/3 | 2/3 |
| "can you make it easier?" (not in the rule) | not run | not run | 1/3 | 2/3 |
| "too hard, explain again" (not in the rule) | not run | not run | 2/3 | 2/3 |
| **Total, same 3 phrasings** | **1/9** | **1/9** | **2/9** | **4/9** |
| **Total, all 5 phrasings** | not run | not run | **5/15** | **8/15** |

Compare old and new only on the "same 3 phrasings" row, because it is the same test for both rules. The two extra phrasings were run only with the new rule. They show that the rule also works for wording it doesn't list, not that it got better: 5/15 and 8/15 are not comparable with the old 1/9.

**The "≤ 20% longer" criterion was added after seeing these results, not planned before the test.** The usual first answer is already short, about 45 words. Explaining a term in everyday words takes a few more words than the term itself: "converges" becomes "pulls light rays toward a single point". So a good simpler answer can be a little longer than the first one, and "shorter" fails it. 20% of 45 words is about 9 words, enough to explain a term or two. It still catches answers that grow by adding material: the long failures were 28% to 107% longer, usually because of added terms or a "Key points" list. Because this criterion was chosen after seeing the answers, it may fit these runs better than it would fit new ones.

What did not depend on the length criterion:

- With the new rule, all 15 answers drop "spherical" and explain "converges" in everyday words. With the old rule, 6 of 9 kept "spherical" or barely changed the first answer. "I didn't understand that" got back almost the same answer word for word in 2 of 3 runs.
- All 15 new answers still give the core idea: the lens is thicker in the middle and brings light rays together.
- 3 of 15 new answers had a **wrong** claim. Two said "objects that are far away can appear closer (or larger)". One said the focal point *is* the focal length.

The default test ("explain that more simply", 5 runs, `simpler_easier_rule.json`) with the new rule: **wrong** 0 of 5, **true but extra** 2 of 5 (both "glass"), **fine** 3 of 5. 1 of 5 answers is shorter than the first answer and 3 of 5 are at most 20% longer. All 5 drop "spherical" and keep the core idea.

## Two wrong facts that keep coming back

Across all result files so far (51 first answers and 51 follow-ups, October 2026), two wrong facts keep showing up:

- **"Objects that are far away appear larger or closer."** It appears in 4 follow-ups ("larger or closer", "closer or larger", "larger and closer", "closer") and never in a first answer. The passages say the image of a very distant object is "highly diminished". This one is outside knowledge.
- **"A magnifying glass gives a real image."** For example: "used when a sharp, real image is needed, such as in magnifying glasses or cameras". It appears in 3 first answers, which have no history and no follow-up rule, and 2 of those follow-ups repeated it. The passages' table says an object between the focus and the lens gives an enlarged, virtual and erect image. This one is a mix-up of two parts of the passages, like the "real, inverted" reading-lens examples above.

Because the second one already appears in first answers, changing the follow-up rules cannot fix it. Check first answers for it too, not only follow-ups.

## Known limits

The re-explanation rule is staying as it is for now. It fixed what matters most to users: easier words, hard terms explained, and the core idea kept, even for wording the rule doesn't list. These problems remain:

- **New terms despite the rule.** The rule says not to add terms, but 12 of the 20 follow-ups with the new rule bring in "focal point", "focal length" or "principal focus" when the first answer didn't use that term. In one of them, "focal point" just replaces the first answer's "principal focus". The old rule did the same in 4 of 9.
- **"A piece of glass".** 11 of the 20 follow-ups with the new rule say the lens is made of glass, compared with 1 of 9 under the old rule. Asking for everyday words seems to pull it in. It is **true but extra**: the passages never say what a lens is made of.
- **The two recurring wrong facts** (above) need a checking step after the answer, or citations, not more prompt rules. Earlier prompt changes did not reduce them, and the magnifying-glass one appears before any follow-up rule applies. Citations would expose the far-away one, which no passage supports. They would not catch the magnifying-glass one, because each of its two parts does come from a passage, so that one needs a check.
