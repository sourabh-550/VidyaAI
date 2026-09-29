// Shared frame for landing sections: same max-width and side padding as the
// nav and hero, a 1px top border instead of shadows, and a serif heading.
// layout="split" puts the heading beside the content on desktop.
export default function Section({ id, title, intro, layout = "stacked", children }) {
  const headingId = `${id}-heading`;
  const split = layout === "split";

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="border-t border-border px-4 py-16 sm:px-6 sm:py-20"
    >
      <div
        className={`mx-auto max-w-[1120px] ${
          split ? "grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16" : ""
        }`}
      >
        <div>
          <h2 id={headingId} className="font-display text-3xl font-semibold text-text">
            {title}
          </h2>
          {intro && <p className="mt-3 max-w-2xl text-muted">{intro}</p>}
        </div>
        <div className={split ? "" : "mt-10"}>{children}</div>
      </div>
    </section>
  );
}
