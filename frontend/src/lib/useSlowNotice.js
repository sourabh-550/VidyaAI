import { useEffect, useState } from "react";

// True once `active` has stayed true for `delay` ms. The backend's hosting
// plan sleeps when idle, so the first request after a while can be slow.
export default function useSlowNotice(active, delay = 5000) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  return slow;
}
