import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export const runtime = "edge";
export const alt = "Map on idomap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function OGImage({ params }: { params: { id: string } }) {
  const mapId = params.id as Id<"maps">;

  let title = "Map";
  let description = "";
  let thumbnailUrl: string | null = null;

  try {
    const map = await convex.query(api.maps.getMap, { mapId });
    if (map) {
      title = map.title || "Untitled map";
      description = map.description || "";
      if (map.thumbnailId) {
        thumbnailUrl = await convex.query(api.maps.getThumbnailUrl, {
          storageId: map.thumbnailId,
        });
      }
    }
  } catch {
    // fallback to default
  }

  if (thumbnailUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
          }}
        >
          <img
            src={thumbnailUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              padding: "40px 48px",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
            }}
          >
            <span
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "white",
              }}
            >
              {title}
            </span>
            {description && (
              <span
                style={{
                  fontSize: 20,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 8,
                }}
              >
                {description.slice(0, 120)}
              </span>
            )}
            <span
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.4)",
                marginTop: 12,
              }}
            >
              idomap.com
            </span>
          </div>
        </div>
      ),
      { ...size }
    );
  }

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
        <svg width="64" height="64" viewBox="0 0 512 512" fill="none">
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
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            marginTop: 24,
            maxWidth: 800,
            textAlign: "center",
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.5)",
              marginTop: 12,
              maxWidth: 600,
              textAlign: "center",
            }}
          >
            {description.slice(0, 120)}
          </span>
        )}
        <span
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.3)",
            marginTop: 16,
          }}
        >
          idomap.com
        </span>
      </div>
    ),
    { ...size }
  );
}
