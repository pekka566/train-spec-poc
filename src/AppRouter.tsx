import { useState, useEffect } from "react";
import App from "./App";
import { LiveView } from "./components/live/LiveView";

function getViewFromHash(): "history" | "live" {
  return window.location.hash === "#/" ? "history" : "live";
}

export function AppRouter() {
  const [view, setView] = useState<"history" | "live">(getViewFromHash);

  useEffect(() => {
    const handler = () => setView(getViewFromHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return view === "live" ? <LiveView /> : <App />;
}
