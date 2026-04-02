import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function getMap(id: string) {
  try {
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
  const map = await getMap(params.id);
  if (!map) return { title: "Map not found" };

  const title = map.title || "Untitled map";
  const description = map.description || "A map created with MapMaker";

  return {
    title,
    description,
    openGraph: {
      title: `${title} | MapMaker`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | MapMaker`,
      description,
    },
  };
}

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {children}
    </div>
  );
}
