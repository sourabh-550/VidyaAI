import { ChevronRight } from "lucide-react";

// Collapsible list of the passages one answer was built from. Uses only the
// fields the API returns per source: `chunk` and `similarity_score`.
export default function SourceChunks({ sources }) {
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
            <blockquote className="mt-1.5 border-l-[3px] border-highlight-line pl-3 text-sm leading-relaxed text-text">
              {source.chunk}
            </blockquote>
          </li>
        ))}
      </ol>
    </details>
  );
}
