// Finds the sentences in a source passage that share meaningful words with
// the student's question, so the Sources list can highlight them.

// Common words that say nothing about the topic. Tokens shorter than 3
// letters (like "np", "is") are dropped separately.
const STOPWORDS = new Set([
  "what", "whats", "which", "who", "whom", "whose", "why", "how", "when", "where",
  "the", "and", "but", "for", "nor", "yet", "with", "without", "from", "into", "onto",
  "about", "above", "below", "over", "under", "between", "through", "during", "after", "before",
  "are", "was", "were", "been", "being", "does", "did", "doing", "done", "has", "have", "had",
  "can", "could", "would", "should", "will", "shall", "may", "might", "must",
  "this", "that", "these", "those", "there", "here", "their", "them", "they", "then", "than",
  "its", "his", "her", "hers", "our", "ours", "your", "yours", "you", "she", "him", "who",
  "not", "all", "any", "some", "more", "most", "very", "also", "just", "only", "such", "like",
  "each", "other", "same", "own", "too", "per", "via", "etc",
  "explain", "describe", "define", "tell", "give", "list", "mean", "means", "meaning",
  "please", "simple", "simply", "words", "word", "example", "examples", "briefly", "short",
  "detail", "details", "difference", "differences", "summarize", "summary", "answer",
  // Generic verbs and nouns that would highlight unrelated sentences.
  "look", "looks", "take", "takes", "make", "makes", "made", "get", "gets", "use", "uses", "used",
  "work", "works", "happen", "happens", "call", "called", "find", "show", "shows", "know",
  "many", "much", "way", "ways", "thing", "things",
]);

const WORD = /[\p{L}\p{N}]+/gu;

// Light stemming so "leaves"/"leaf" and "plants"/"plant" still match.
function stem(word) {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("ves")) return word.slice(0, -3) + "f";
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// The set of meaningful, stemmed words in a question.
export function questionTerms(question = "") {
  const terms = new Set();
  for (const [raw] of question.toLowerCase().matchAll(WORD)) {
    if (raw.length < 3 || STOPWORDS.has(raw)) continue;
    terms.add(stem(raw));
  }
  return terms;
}

// Splits a passage into sentences and marks those containing a question term.
// No lookbehind in the regex, so it also works on older mobile browsers.
export function markSentences(text = "", terms) {
  const sentences = text.match(/[^.!?]+(?:[.!?]+["')\]]*)?\s*/g) || [text];
  return sentences.map((sentence) => ({
    text: sentence,
    match:
      terms.size > 0 &&
      [...sentence.toLowerCase().matchAll(WORD)].some(([w]) => w.length >= 3 && terms.has(stem(w))),
  }));
}
