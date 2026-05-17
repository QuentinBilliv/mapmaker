import type { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const baseUrl = "https://idomaps.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/try`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/maps`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const maps = await convex.query(api.maps.listPublicMapIds, {});
    const mapEntries: MetadataRoute.Sitemap = maps.map((m) => ({
      url: `${baseUrl}/maps/${m.id}`,
      lastModified: new Date(m.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return [...staticEntries, ...mapEntries];
  } catch {
    return staticEntries;
  }
}
