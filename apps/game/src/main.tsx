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

// Secure localhost also exercises the shipped worker in the release verifier.
if (import.meta.env.PROD && "serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" }).catch(() => {
      // Offline caching is a bonus; the game works without it.
    });
  });
}
