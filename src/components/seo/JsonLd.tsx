export function WebAppJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "idomaps",
    url: "https://idomaps.app",
    description:
      "Draw, style, and share thematic maps online. Free browser-based cartography tool with GeoJSON export.",
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Draw polygons, polylines, points, and text on maps",
      "Style features with colors, patterns, and icons",
      "Export to GeoJSON and idomaps format",
      "Share maps publicly",
      "Multiple base maps including OpenStreetMap",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function MapJsonLd({
  url,
  name,
  description,
  keywords,
}: {
  url: string;
  name: string;
  description: string;
  keywords?: string[];
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": url,
    url,
    name,
    description,
    ...(keywords && keywords.length ? { keywords: keywords.join(", ") } : {}),
    isPartOf: {
      "@type": "WebApplication",
      name: "idomaps",
      url: "https://idomaps.app",
    },
    creator: { "@type": "Organization", name: "idomaps" },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
