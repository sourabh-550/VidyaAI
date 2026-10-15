// Set VITE_API_BASE in frontend/.env.development.local to use a local backend
// with `npm run dev`. Builds don't read that file, so they use Render.
export const API_BASE = (
  import.meta.env.VITE_API_BASE || "https://vidya-ai-backend.onrender.com"
).replace(/\/+$/, "");

// The hidden PDF input in the hero. The nav's "Upload a PDF" button
// opens the same picker so there is one upload flow.
export const UPLOAD_INPUT_ID = "pdf-upload-input";
