const REPO_URL = "https://github.com/sourabh-550/VidyaAI";
const AUTHOR_URL = "https://github.com/sourabh-550";

const linkClass =
  "rounded-sm text-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-display text-lg font-bold text-text">VidyaAI</span>
          <p className="mt-1 text-sm text-muted">
            A study tool that answers questions from your own textbook, made for
            Class 6–12.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Built by Sourabh Saxena
          </a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
            View the code on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
