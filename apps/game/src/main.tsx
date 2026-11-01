import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CampaignApp as App } from "./campaign/CampaignApp";
import '@starshot/presentation/base.css';
import '@starshot/presentation/entry.css';
import '@starshot/presentation/cloud.css';
import './campaign/campaign.css';

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Offline support: cache the static build after the first visit (production only).
if (import.meta.env.PROD && "serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {
      // Offline caching is a bonus; the game works without it.
    });
  });
}
