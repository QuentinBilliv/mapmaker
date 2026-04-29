import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "idomaps — Thematic cartography";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 512 512"
            fill="none"
          >
            <rect width="512" height="512" rx="96" fill="#333" />
            <path
              d="M160 120 L160 392 L256 340 L352 392 L352 120 L256 172 Z"
              stroke="white"
              strokeWidth="32"
              strokeLinejoin="round"
              fill="none"
            />
            <line x1="256" y1="172" x2="256" y2="340" stroke="white" strokeWidth="24" />
            <circle cx="256" cy="172" r="16" fill="#ef4444" />
          </svg>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            idomaps
          </span>
        </div>
        <span
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Create thematic maps online
        </span>
        <span
          style={{
            fontSize: 20,
            color: "#71717a",
            marginTop: "16px",
          }}
        >
          idomaps.com
        </span>
      </div>
    ),
    { ...size }
  );
}
