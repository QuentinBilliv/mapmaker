import type { Metadata } from "next";
import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { fetchAndDecodeMapData } from "@/lib/decode-map-data";
import { MapJsonLd } from "@/components/seo/JsonLd";
import MapViewClient from "./MapViewClient";

export const revalidate = 86400;

const SITE_URL = "https://idomaps.app";
const MAX_LABELS = 200;

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}

const getMapCached = cache(async (id: string) => {
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    return await convex.query(api.maps.getMap, { mapId: id as Id<"maps"> });
  } catch {
    return null;
  }
});

const getLabelsCached = cache(async (id: string): Promise<string[]> => {
  const map = await getMapCached(id);
  if (!map) return [];
  const raw = map as Record<string, unknown>;
  let features = (raw.features as { label?: string }[] | undefined) ?? undefined;
  let groups = (raw.groups as { label?: string }[] | undefined) ?? undefined;
  let legendEntries = (raw.legendEntries as { label?: string }[] | undefined) ?? undefined;

  const dataFileUrl = "dataFileUrl" in map ? (map.dataFileUrl as string | null) : null;
  if (!features && dataFileUrl) {
    try {
      const data = await fetchAndDecodeMapData<{
        features?: { label?: string }[];
        groups?: { label?: string }[];
        legendEntries?: { label?: string }[];
      }>(dataFileUrl);
      features = data.features;
      groups = data.groups;
      legendEntries = data.legendEntries;
    } catch {
      // fall through to whatever inline metadata exists
    }
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of [legendEntries, groups, features]) {
    for (const item of list ?? []) {
      const l = item?.label?.trim();
      if (!l || seen.has(l.toLowerCase())) continue;
      seen.add(l.toLowerCase());
      out.push(l);
      if (out.length >= MAX_LABELS) return out;
    }
  }
  return out;
});

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const map = await getMapCached(params.id);

  if (!map || !map.title) {
    return { title: "Map", robots: { index: false, follow: true } };
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

export default async function MapViewPage({
  params,
}: {
  params: { id: string };
}) {
  const map = await getMapCached(params.id);

  if (!map || !map.title) {
    return <MapViewClient params={params} />;
  }

  const tags = Array.isArray(map.tags) ? map.tags.filter(Boolean) : [];
  const labels = await getLabelsCached(params.id);
  const canonical = `${SITE_URL}/maps/${params.id}`;

  return (
    <>
      <MapJsonLd
        url={canonical}
        name={map.title}
        description={map.description || `${map.title} — interactive thematic map made with idomaps.`}
        keywords={tags}
      />
      <div className="px-4 py-2 border-b shrink-0">
        <h1 className="text-lg font-semibold">{map.title}</h1>
        {map.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {map.description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
        {labels.length > 0 && (
          <details className="mt-1 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">
              Map contents ({labels.length})
            </summary>
            <p className="mt-1 leading-relaxed">{labels.join(" · ")}</p>
          </details>
        )}
      </div>
      <MapViewClient params={params} hideTitle />
    </>
  );
}
