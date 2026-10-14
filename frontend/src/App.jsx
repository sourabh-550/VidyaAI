import { useState } from "react";
import Header from "./components/Header";
import LandingPage from "./components/landing/LandingPage";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const [pdfReady, setPdfReady] = useState(false);
  const [filename, setFilename] = useState("");

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
              <ChatPanel filename={filename} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
