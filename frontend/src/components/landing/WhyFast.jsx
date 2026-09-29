import Section from "./Section";

// Bar widths are proportional to the words sent: 1,500 / 6,000 = 25%.
const BARS = [
  {
    label: "Without pruning",
    value: "20 passages · ~6,000 words sent to the AI",
    width: "100%",
    barClass: "bg-muted/40",
  },
  {
    label: "With pruning",
    value: "5 passages · ~1,500 words sent to the AI",
    width: "25%",
    barClass: "bg-primary",
  },
];

export default function WhyFast() {
  return (
    <Section
      id="why-fast"
      title="Why it's fast and cheap"
      intro="VidyaAI is built for students in low-connectivity areas and runs on free-tier APIs."
      layout="split"
    >
      <figure>
        <div className="space-y-6">
          {BARS.map((bar) => (
            <div key={bar.label}>
              <p className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="font-medium text-text">{bar.label}</span>
                <span className="font-mono text-sm text-muted">{bar.value}</span>
              </p>
              <div
                className={`mt-2 h-3 rounded-sm ${bar.barClass}`}
                style={{ width: bar.width }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
        <figcaption className="mt-6 text-muted">
          Less text for the AI to read means faster answers and a lower cost per
          question. In testing, pruning cut response time by about 35%.
        </figcaption>
      </figure>
    </Section>
  );
}
