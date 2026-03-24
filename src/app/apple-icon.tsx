import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1a1a1a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "36px",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 512 512"
          fill="none"
        >
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
      </div>
    ),
    { ...size }
  );
}
