"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}

/**
 * Root-level boundary — fires when the (admin) error.tsx or login layout
 * itself crashes. Must declare its own <html>/<body> per Next 16. Kept
 * minimal because the regular admin segment boundary handles 99% of
 * runtime errors.
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: Props) {
  useEffect(() => {
    console.error("[admin] global error", error);
  }, [error]);

  function handleRetry() {
    if (unstable_retry) unstable_retry();
    else if (reset) reset();
    else if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          background: "#e7e2d6",
          color: "#1a1a1a",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <section
          style={{
            maxWidth: 480,
            background: "#ffffff",
            border: "1.5px solid #1a1a1a",
            borderRadius: 3,
            padding: 20,
            boxShadow: "4px 4px 0 #1a1a1a",
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8a8378",
              margin: 0,
            }}
          >
            Deligo Admin
          </p>
          <h1
            style={{
              fontSize: 22,
              fontFamily: "'Times New Roman', serif",
              fontWeight: 800,
              margin: "4px 0 8px",
            }}
          >
            The portal crashed.
          </h1>
          <p
            style={{ fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 }}
          >
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#8a8378",
                margin: "0 0 16px",
                wordBreak: "break-all",
              }}
            >
              Digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleRetry}
            style={{
              border: "1.5px solid #c8321b",
              background: "#c8321b",
              color: "#ffffff",
              padding: "8px 14px",
              borderRadius: 4,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </section>
      </body>
    </html>
  );
}
