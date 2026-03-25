import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const mapId = params.id as Id<"maps">;

  try {
    const map = await convex.query(api.maps.getMap, { mapId });
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
  } catch {
    return { title: "Map" };
  }
}

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
