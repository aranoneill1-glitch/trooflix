"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [hasReloaded, setHasReloaded] = useState(false);

  useEffect(() => {
    // Detect chunk load errors (the "l[e] is not a function" / ChunkLoadError)
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("is not a function");

    if (isChunkError) {
      // Only auto-reload once per session to prevent infinite loops
      const reloadKey = "trooflix:chunk-reload-" + window.location.pathname;
      const alreadyReloaded = sessionStorage.getItem(reloadKey);

      if (!alreadyReloaded && !hasReloaded) {
        setHasReloaded(true);
        sessionStorage.setItem(reloadKey, "1");
        // Small delay to ensure the error is fully rendered first
        setTimeout(() => {
          window.location.reload();
        }, 100);
        return;
      }
    }
  }, [error, hasReloaded]);

  return (
    <html>
      <body style={{ margin: 0, background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "12px" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "24px" }}>
              This can happen right after an update. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                // Clear the reload flag so the user can retry from scratch
                sessionStorage.removeItem("trooflix:chunk-reload-" + window.location.pathname);
                window.location.reload();
              }}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
