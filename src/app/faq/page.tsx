import type { Metadata } from "next";
import Link from "next/link";
import { FaqJsonLd } from "@/components/seo/JsonLd";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about idomaps: what it is, whether it is free, GeoJSON import and export, sharing and embedding maps, and how it compares to other map makers.",
  alternates: { canonical: "https://idomaps.app/faq" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is idomaps?",
    a: "idomaps is a free, browser-based thematic map editor. You draw polygons, lines, points, text, arrows, circles and rectangles on real base maps, style them, organize them with groups and a legend, then export to GeoJSON or share an interactive map online.",
  },
  {
    q: "Is idomaps free?",
    a: "Yes. idomaps is free to use, including drawing, styling, exporting GeoJSON, and publishing or embedding maps.",
  },
  {
    q: "Do I need an account to use idomaps?",
    a: "No. You can start making a map immediately with no signup. An account is only needed to save your maps and publish them at a public link.",
  },
  {
    q: "Can I import and export GeoJSON?",
    a: "Yes. idomaps imports GeoJSON and exports your map back to GeoJSON, as well as to its own .idomaps format that preserves styling, groups and legend.",
  },
  {
    q: "What can I draw on a map?",
    a: "Polygons, polylines, points, text labels, arrows, circles and rectangles. Each feature can be styled independently with colors, opacity, fill patterns, line styles, custom SVG markers, icons and a hover highlight color.",
  },
  {
    q: "What base maps are available?",
    a: "Several, including OpenStreetMap, Voyager, a topographic style and satellite imagery, with a flat or globe projection.",
  },
  {
    q: "Can I make a choropleth or data map?",
    a: "Yes. You can color countries, states, provinces and other regions from built-in tile layers to build choropleth and data maps.",
  },
  {
    q: "Can I share or embed a map?",
    a: "Yes. Published maps get a public URL you can share, and an iframe snippet to embed the interactive map on any website.",
  },
  {
    q: "How is idomaps different from Google My Maps or Mapchart?",
    a: "idomaps focuses on thematic cartography: arbitrary geometry, per-feature styling, groups and a shared legend, GeoJSON import and export, and a portable map you can embed anywhere. It is not locked to a single platform or dataset.",
  },
  {
    q: "Is my map private?",
    a: "Maps are private by default. You choose if and when to make a map public or unlisted; private maps are not indexed or shown publicly.",
  },
  {
    q: "Does idomaps work on mobile?",
    a: "The editor is designed for desktop, where precise drawing and a wider screen matter. Viewing, exploring and embedded maps work on any device.",
  },
  {
    q: "Who is idomaps for?",
    a: "Teachers and students, researchers and journalists, travelers, worldbuilders and content creators — anyone who needs a clear thematic or reference map without GIS software.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <FaqJsonLd items={FAQS} />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to idomaps
        </Link>
        <h1 className="text-2xl font-bold mt-6 mb-2">Frequently asked questions</h1>
        <p className="text-sm text-muted-foreground mb-8">
          What idomaps is, what it does, and how to use it.
        </p>
        <div className="space-y-8">
          {FAQS.map(({ q, a }) => (
            <section key={q}>
              <h2 className="text-base font-semibold mb-1.5">{q}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </section>
          ))}
        </div>
        <div className="mt-12 border-t pt-6">
          <Link
            href="/try"
            className="text-sm font-medium text-foreground hover:underline"
          >
            Try the editor &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
