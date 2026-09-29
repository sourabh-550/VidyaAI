import Section from "./Section";

const STEPS = [
  {
    title: "Upload your textbook",
    text: "Pick the PDF of one chapter or the whole book.",
  },
  {
    title: "Ask a doubt in your own words",
    text: "Type it the way you would ask your teacher.",
  },
  {
    title: "Get an answer with the exact lines it came from",
    text: "Every answer shows the passages from your book it was built on, so you can check it.",
  },
];

export default function HowItWorks() {
  return (
    <Section id="how-it-works" title="How it works">
      <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10">
        {STEPS.map((step, i) => (
          <li key={step.title} className="border-t border-border pt-5">
            <span className="font-display text-3xl font-bold text-primary" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="mt-2 font-display text-lg font-semibold text-text">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-2 text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
