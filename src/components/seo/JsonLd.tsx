export function WebAppJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MapMaker",
    url: "https://mapmaker.dev",
    description:
      "Draw, style, and share historical and thematic maps online. Free browser-based cartography tool with GeoJSON export.",
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
      "Export to GeoJSON and MapMaker format",
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
