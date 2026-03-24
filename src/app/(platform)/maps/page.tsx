import type { Metadata } from "next";
import MapLibrary from "@/components/maps/MapLibrary";

export const metadata: Metadata = {
  title: "Public maps",
  description:
    "Browse public historical and thematic maps created by the MapMaker community.",
  openGraph: {
    title: "Public maps | MapMaker",
    description:
      "Browse public historical and thematic maps created by the MapMaker community.",
  },
};

export default function MapsPage() {
  return <MapLibrary />;
}
