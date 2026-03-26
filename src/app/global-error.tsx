"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", backgroundColor: "#fff", color: "#1a1a1a" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", textAlign: "center" }}>
          <span style={{ fontSize: "6rem", fontWeight: 700, color: "rgba(0,0,0,0.08)" }}>500</span>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "1rem" }}>Something went wrong</h1>
          <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem", maxWidth: "28rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
