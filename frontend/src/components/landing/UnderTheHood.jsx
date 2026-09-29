import { ArrowDown, ArrowRight } from "lucide-react";
import Section from "./Section";

const PIPELINE = [
  "PDF",
  "300-word chunks",
  "Cohere embeddings",
  "FAISS top-20",
  "Context pruning top-5",
  "Groq gpt-oss-20b",
  "Answer + sources",
];

const STACK = [
  "React + Vite on Vercel",
  "FastAPI on Render",
  "FAISS IndexFlatIP",
  "Cohere",
  "Groq",
];

export default function UnderTheHood() {
  return (
    <Section
      id="under-the-hood"
      title="Under the hood"
      intro="The retrieval pipeline behind every answer."
    >
      {/* Vertical on mobile, one row on desktop. */}
      <ol className="flex flex-col items-center lg:flex-row lg:items-stretch">
        {PIPELINE.map((step, i) => (
          <li
            key={step}
            className="flex w-full max-w-xs flex-col items-center lg:max-w-none lg:flex-1 lg:flex-row lg:items-stretch"
          >
            <span
              className={`flex w-full flex-1 items-center justify-center rounded-lg border bg-surface px-3 py-3 text-center font-mono text-[13px] ${
                step.startsWith("Context pruning")
                  ? "border-primary text-primary"
                  : "border-border text-text"
              }`}
            >
              {/* Words never break inside, so "gpt-oss-20b" stays whole. */}
              <span>
                {step.split(" ").map((word, w) => (
                  <span key={w}>
                    {w > 0 && " "}
                    <span className="whitespace-nowrap">{word}</span>
                  </span>
                ))}
              </span>
            </span>
            {i < PIPELINE.length - 1 && (
              <>
                <ArrowDown className="my-1.5 h-4 w-4 shrink-0 text-muted lg:hidden" aria-hidden="true" />
                <ArrowRight className="mx-1.5 hidden h-4 w-4 shrink-0 self-center text-muted lg:block" aria-hidden="true" />
              </>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-muted">
        {STACK.map((item, i) => (
          <span key={item}>
            {i > 0 && " · "}
            <span className="whitespace-nowrap">{item}</span>
          </span>
        ))}
      </p>
    </Section>
  );
}
