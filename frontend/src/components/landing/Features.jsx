import Section from "./Section";

const FEATURES = [
  {
    title: "Ask anything from your book",
    text: "Doubts, definitions or summaries, answered only from the PDF you uploaded.",
  },
  {
    title: "See the source for every answer",
    text: "Each answer lists the passages it used, with a relevance score for each.",
  },
  {
    title: "Ask follow-up questions",
    text: "Say \"explain that more simply\" and it knows what you were just talking about.",
  },
  {
    title: "Built for slow connections",
    text: "No videos or heavy images, so pages stay light on mobile data.",
  },
];

export default function Features() {
  return (
    <Section id="features" title="Features">
      {/* 2×2 on desktop, one column on mobile, divided by 1px borders. */}
      <ul className="grid border-t border-border md:grid-cols-2">
        {FEATURES.map((f, i) => (
          <li
            key={f.title}
            className={`border-b border-border py-6 ${
              i % 2 === 0 ? "md:pr-8" : "md:border-l md:pl-8"
            }`}
          >
            <h3 className="font-display text-lg font-semibold text-text">{f.title}</h3>
            <p className="mt-1 text-muted">{f.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
