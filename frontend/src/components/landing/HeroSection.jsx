import UploadPanel from "../UploadPanel";
import { USER_BUBBLE } from "../../lib/styles";

const PROOF_POINTS = [
  "Works on slow connections",
  "Every answer shows its source",
  "~35% lower latency with context pruning",
];

export default function HeroSection({ onSuccess }) {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:py-24" aria-labelledby="hero-heading">
      <div className="mx-auto max-w-[1120px]">
        {/* Spans both columns on desktop so each sentence fits on one line;
            on smaller screens it wraps naturally. */}
        <h1
          id="hero-heading"
          className="font-display text-[length:clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.1] text-text"
        >
          <span className="lg:block">Ask your textbook anything.</span>{" "}
          <span className="lg:block">Get answers, not buffering.</span>
        </h1>

        <div className="mt-5 grid items-start gap-12 lg:mt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className="max-w-xl text-lg text-muted">
              Upload a PDF, ask in plain language, and get answers taken straight
              from your book, even on a slow connection. Made for Class 6–12.
            </p>
  
            <UploadPanel onSuccess={onSuccess} className="mt-8">
              <a
                href="#how-it-works"
                className="rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                See how it works
              </a>
            </UploadPanel>
  
            {/* Each point stays on one line; a wrap can only happen after a "·". */}
            <p className="mt-8 text-sm text-muted">
              {PROOF_POINTS.map((point, i) => (
                <span key={point}>
                  {i > 0 && " · "}
                  <span className="whitespace-nowrap">{point}</span>
                </span>
              ))}
            </p>
          </div>
  
          <DemoCard />
        </div>
      </div>
    </section>
  );
}

// DEMO CONTENT: a static, hardcoded example of an answer. It does not call the
// API; it only shows what a real answer, its source and its stats look like.
function DemoCard() {
  return (
    <figure
      aria-label="Example answer from VidyaAI"
      className="rounded-[10px] border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      {/* Same bubble as the student's messages in the real chat. */}
      <p className={USER_BUBBLE}>
        Why do leaves look green?
      </p>

      <p className="mt-4 text-text">
        Leaves look green because they contain a pigment called chlorophyll.
        Chlorophyll absorbs red and blue light from sunlight and reflects green
        light, so green is the colour our eyes see.
      </p>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-medium text-accent">Science textbook · p. 98</p>
        <blockquote className="mt-2 text-sm text-muted">
          Leaves contain a green pigment called chlorophyll, which helps plants
          capture the energy of sunlight.{" "}
          <mark className="rounded-sm bg-highlight px-0.5 text-text">
            Chlorophyll absorbs red and blue light but reflects green light,
            which is why leaves appear green.
          </mark>{" "}
          Plants use this energy to make food by photosynthesis.
        </blockquote>
      </div>

      <figcaption className="mt-5 border-t border-border pt-3 font-mono text-[13px] text-text">
        20 passages checked · 5 used · 1.8s
      </figcaption>
    </figure>
  );
}
