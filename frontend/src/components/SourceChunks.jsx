import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { markSentences, questionTerms } from "../lib/highlight";

// Collapsible list of the passages one answer was built from. Uses only the
// fields the API returns per source: `chunk` and `similarity_score`.
export default function SourceChunks({ sources, question }) {
  const terms = useMemo(() => questionTerms(question), [question]);

  return (
    <details className="group mt-4 rounded-[10px] border border-border bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[10px] px-4 text-sm font-medium text-text transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-90"
          aria-hidden="true"
        />
        Sources
        <span className="font-normal text-muted">({sources.length})</span>
      </summary>

      <ol className="space-y-5 border-t border-border px-4 py-4">
        {sources.map((source, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-accent">Passage {i + 1}</span>
              {typeof source.similarity_score === "number" && (
                <span className="font-mono text-xs text-muted">
                  relevance {source.similarity_score.toFixed(2)}
                </span>
              )}
            </div>
            <Passage text={source.chunk} terms={terms} />
          </li>
        ))}
      </ol>
    </details>
  );
}

// Shows the first 3 lines, with a toggle only when the passage is longer.
// Sentences sharing meaningful words with the question are highlighted.
function Passage({ text, terms }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef();
  const id = useId();
  const sentences = useMemo(() => markSentences(text, terms), [text, terms]);

  // Measure while clamped. A ResizeObserver catches the moment the closed
  // <details> opens (the passage has no size before that) and screen resizes.
  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <>
      <blockquote
        id={id}
        ref={ref}
        className={`mt-1.5 border-l-[3px] border-highlight-line pl-3 text-sm leading-relaxed text-text ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {sentences.map((s, i) => {
          if (!s.match) return <span key={i}>{s.text}</span>;
          // Keep the space after the sentence outside the highlight.
          const core = s.text.trimEnd();
          return (
            <span key={i}>
              <mark className="rounded-sm bg-highlight px-0.5 text-text [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                {core}
              </mark>
              {s.text.slice(core.length)}
            </span>
          );
        })}
      </blockquote>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 ml-3 rounded-sm py-1 text-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {expanded ? "Show less" : "Show full passage"}
        </button>
      )}
    </>
  );
}
