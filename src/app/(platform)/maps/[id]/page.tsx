import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import MapViewClient from "./MapViewClient";

const SITE_URL = "https://idomaps.app";

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}

async function fetchMapMeta(id: string) {
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    return await convex.query(api.maps.getMap, { mapId: id as Id<"maps"> });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const map = await fetchMapMeta(params.id);

  if (!map || !map.title) {
    return {
      title: "Map",
      robots: { index: false, follow: true },
    };
  }

  const title = truncate(map.title, 65);
  const tags = Array.isArray(map.tags) ? map.tags.filter(Boolean) : [];
  const description = map.description
    ? truncate(map.description, 155)
    : truncate(
        `${map.title} — an interactive thematic map made with idomaps${
          tags.length ? `. ${tags.slice(0, 5).join(", ")}` : ""
        }.`,
        155,
      );
  const canonical = `${SITE_URL}/maps/${params.id}`;

  return {
    title,
    description,
    keywords: tags.length ? tags : undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: "idomaps",
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default function MapViewPage({ params }: { params: { id: string } }) {
  return <MapViewClient params={params} />;
}
