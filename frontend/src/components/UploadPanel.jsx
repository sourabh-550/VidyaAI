import { useState, useRef } from "react";
import axios from "axios";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE, UPLOAD_INPUT_ID } from "../lib/constants";
import Button from "./ui/Button";
import SlowServerNotice from "./ui/SlowServerNotice";
import useSlowNotice from "../lib/useSlowNotice";
import apiErrorMessage from "../lib/apiError";

export default function UploadPanel({ onSuccess, className = "", children }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef();
  const slow = useSlowNotice(loading);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      setStatus("error:Only PDF files are supported.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setProgress(0);
    setStatus("loading:");

    const iv = setInterval(
      () => setProgress((p) => (p < 82 ? p + Math.random() * 5 : p)),
      400
    );

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        timeout: 120000,
      });
      clearInterval(iv);
      setProgress(100);
      setStatus(
        `ok:${res.data.filename} · ${res.data.chunks_created} passages indexed`
      );
      setTimeout(() => onSuccess(res.data.filename), 900);
    } catch (err) {
      clearInterval(iv);
      setStatus(
        "error:" + apiErrorMessage(err, "Upload failed. Try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const type = status.split(":")[0];
  const msg = status.split(":").slice(1).join(":");

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button
          size="lg"
          disabled={loading}
          aria-describedby="upload-status"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={drag ? "ring-2 ring-primary ring-offset-2 ring-offset-bg" : ""}
        >
          {loading ? "Uploading…" : "Upload a textbook"}
        </Button>
        {children}
      </div>

      <input
        ref={inputRef}
        id={UPLOAD_INPUT_ID}
        type="file"
        accept=".pdf"
        className="hidden"
        tabIndex={-1}
        disabled={loading}
        aria-hidden="true"
        onChange={(e) => {
          handleFile(e.target.files[0]);
          // Clear the input so picking the same file again (e.g. after an
          // error) still triggers a new upload.
          e.target.value = "";
        }}
      />

      <div id="upload-status" aria-live="polite">
        {type === "loading" && (
          <div className="mt-4 max-w-sm">
            <p className="text-sm text-muted">
              Reading your textbook. Large PDFs can take a minute.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label="Upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-9 text-right font-mono text-xs text-muted">
                {Math.round(progress)}%
              </span>
            </div>
            {slow && (
              <SlowServerNotice className="mt-3">
                Waking up the server. The first upload can take up to a minute.
              </SlowServerNotice>
            )}
          </div>
        )}

        {type === "ok" && (
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{msg}</span>
          </p>
        )}

        {type === "error" && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{msg}</span>
          </p>
        )}
      </div>
    </div>
  );
}
