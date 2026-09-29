// Calm note shown when a request has taken more than ~5 seconds, which
// usually means the sleeping server is starting up.
export default function SlowServerNotice({
  children = "Waking up the server. The first question can take up to a minute.",
  className = "",
}) {
  return (
    <p role="status" className={`border-l-2 border-primary pl-3 text-sm text-muted ${className}`}>
      {children}
    </p>
  );
}
