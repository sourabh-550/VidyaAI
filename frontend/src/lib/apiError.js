// The message to show for a failed API call: the backend's `detail` when it is
// a plain string (FastAPI HTTPException), otherwise the given fallback. FastAPI
// validation errors (422) send `detail` as a list, so those use the fallback.
export default function apiErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  return typeof detail === "string" && detail.trim() ? detail : fallback;
}
