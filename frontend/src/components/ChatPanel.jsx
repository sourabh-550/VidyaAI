import { useState, useRef, useEffect, useLayoutEffect } from "react";
import axios from "axios";
import { AlertCircle, Send } from "lucide-react";
import { API_BASE } from "../lib/constants";
import { USER_BUBBLE } from "../lib/styles";
import Markdown from "./ui/Markdown";
import Button from "./ui/Button";
import SourceChunks from "./SourceChunks";
import SlowServerNotice from "./ui/SlowServerNotice";
import useSlowNotice from "../lib/useSlowNotice";
import apiErrorMessage from "../lib/apiError";

const SUGGESTIONS = [
  "Summarize the key topics in this document",
  "What are the main concepts covered?",
  "Explain the first chapter in simple words",
  "What is the most important idea in this book?",
];

const MAX_INPUT_LINES = 5;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ChatPanel({ filename }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();
  const slow = useSlowNotice(loading);

  useEffect(() => {
    if (messages.length === 0 && !loading) return;
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [messages, loading]);

  // Grow the question box with its text, up to ~5 lines; show a scrollbar
  // only when the text is taller than that. Heights include the border
  // (border-box), which scrollHeight leaves out.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const maxHeight = MAX_INPUT_LINES * parseFloat(cs.lineHeight) + padding + border;
    el.style.height = "auto";
    const needed = el.scrollHeight + border;
    el.style.height = `${Math.min(needed, maxHeight)}px`;
    el.style.overflowY = needed > maxHeight + 1 ? "auto" : "hidden";
  }, [question]);

  const ask = async (qOverride) => {
    const q = (qOverride ?? question).trim();
    if (!q || loading) return;
    setMessages((p) => [...p, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    // Browser-side timing: from sending the question to receiving the answer.
    const startedAt = performance.now();
    try {
      const res = await axios.post(`${API_BASE}/ask`, {
        question: q,
        top_k: 5,
        similarity_threshold: 0.25,
      });
      const seconds = (performance.now() - startedAt) / 1000;
      setMessages((p) => [
        ...p,
        {
          role: "ai",
          text: res.data.answer,
          question: q,
          sources: res.data.sources,
          meta: {
            total: res.data.total_candidates,
            pruned: res.data.pruned_count,
            seconds,
          },
        },
      ]);
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          role: "ai",
          text: apiErrorMessage(err, "Something went wrong. Please try again."),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  return (
    // A single notebook-style column. The page scrolls; the question box
    // sticks to the bottom of the screen.
    <div className="flex min-h-[calc(100dvh-7.75rem)] max-w-[720px] flex-col">
      <div className="flex-1 py-8">
        {messages.length === 0 && !loading && (
          <EmptyState filename={filename} onPick={(s) => ask(s)} />
        )}

        <div className="space-y-8">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className={USER_BUBBLE}>
                {m.text}
              </p>
            ) : m.error ? (
              <p key={i} role="alert" className="flex items-start gap-2 text-danger">
                <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{m.text}</span>
              </p>
            ) : (
              <div key={i} className="text-text">
                <Markdown text={m.text} />
                {m.sources?.length > 0 && <SourceChunks sources={m.sources} question={m.question} />}
                {m.meta && (
                  <p className="mt-3 font-mono text-xs text-muted">
                    {m.meta.total} checked · {m.meta.pruned} used
                    {typeof m.meta.seconds === "number" && ` · ${m.meta.seconds.toFixed(1)}s`}
                  </p>
                )}
              </div>
            )
          )}

          {loading && <AnswerSkeleton slow={slow} />}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-bg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-0 sm:px-0">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <textarea
            id="question"
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Ask a doubt from your book…"
            disabled={loading}
            rows={1}
            className="min-h-12 flex-1 resize-none overflow-y-hidden rounded-lg border border-input-border bg-surface px-3 py-3 text-base leading-normal text-text transition-colors duration-150 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="lg"
            disabled={loading || !question.trim()}
            aria-label="Send question"
            className="w-12 shrink-0 px-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
        <p className="mt-2 hidden text-xs text-muted sm:block">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}

function EmptyState({ filename, onPick }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-text">
        Ask your first question
      </h2>
      <p className="mt-2 text-muted">
        Answers come only from{" "}
        {filename ? <span className="font-medium text-text">{filename}</span> : "your textbook"}.
        Try one of these:
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="min-h-12 w-full rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm text-text transition-colors duration-150 hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Static placeholder while the answer loads. No pulsing or looping animation.
function AnswerSkeleton({ slow }) {
  return (
    <div aria-live="polite">
      <p className="text-sm text-muted">Looking through your textbook…</p>
      <div className="mt-3 space-y-2.5" aria-hidden="true">
        <div className="h-3 w-11/12 rounded-sm bg-border" />
        <div className="h-3 w-full rounded-sm bg-border" />
        <div className="h-3 w-2/3 rounded-sm bg-border" />
      </div>
      {slow && <SlowServerNotice className="mt-4" />}
    </div>
  );
}
