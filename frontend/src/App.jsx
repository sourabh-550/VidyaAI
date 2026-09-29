import { useState } from "react";
import Header from "./components/Header";
import LandingPage from "./components/landing/LandingPage";
import ChatPanel from "./components/ChatPanel";
import QuizPage from "./components/QuizPage";

const TABS = [
  { id: "chat", label: "Chat" },
  { id: "quiz", label: "Quiz" },
];

export default function App() {
  const [pdfReady, setPdfReady] = useState(false);
  const [filename, setFilename] = useState("");
  const [activeTab, setActiveTab] = useState("chat");

  const handleUploadSuccess = (name) => {
    setFilename(name);
    setPdfReady(true);
  };

  return (
    <div className="min-h-screen bg-bg">
      <Header pdfReady={pdfReady} filename={filename} />

      <main>
        {!pdfReady ? (
          <LandingPage onSuccess={handleUploadSuccess} />
        ) : (
          // Same max-width and side padding as the nav and landing sections.
          <div className="px-4 sm:px-6">
            <div className="mx-auto max-w-[1120px]">
              <div role="tablist" aria-label="Workspace" className="flex gap-6 border-b border-border">
                {TABS.map((tab) => (
                  <TabButton
                    key={tab.id}
                    id={tab.id}
                    label={tab.label}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </div>

              {/* Both panels stay mounted and the inactive one is hidden, so the
                  chat history and quiz progress survive switching tabs. */}
              <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" hidden={activeTab !== "chat"}>
                <ChatPanel filename={filename} />
              </div>
              <div role="tabpanel" id="panel-quiz" aria-labelledby="tab-quiz" hidden={activeTab !== "quiz"}>
                <QuizPage />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onClick}
      className={`relative -mb-px min-h-12 border-b-2 px-1 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}
