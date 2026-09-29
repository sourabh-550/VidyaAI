import { FileText } from "lucide-react";
import ThemeToggle from "./ui/ThemeToggle";
import Button from "./ui/Button";
import { UPLOAD_INPUT_ID } from "../lib/constants";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Under the hood", href: "#under-the-hood" },
];

// Opens the hero's file picker and brings the hero into view so the
// upload progress is visible.
function openUpload() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById(UPLOAD_INPUT_ID)?.click();
}

export default function Header({ pdfReady, filename }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg px-4 sm:px-6">
      {/* Same max-width and side padding as the page sections, so the edges line up. */}
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-4">
        <span className="font-display text-xl font-bold text-text">VidyaAI</span>

        {!pdfReady && (
          <>
            <nav className="ml-auto hidden items-center gap-6 md:flex" aria-label="Main">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-sm text-sm font-medium text-muted transition-colors duration-150 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <Button
              size="sm"
              onClick={openUpload}
              className="ml-auto md:ml-2"
            >
              Upload a textbook
            </Button>
          </>
        )}

        {pdfReady && filename && (
          <div className="ml-auto flex min-w-0 max-w-[220px] items-center gap-2 text-sm text-muted sm:max-w-xs">
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate" title={filename}>
              {filename}
            </span>
          </div>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
