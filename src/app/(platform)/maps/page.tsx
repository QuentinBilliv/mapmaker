import type { Metadata } from "next";
import MapLibrary from "@/components/maps/MapLibrary";

export const metadata: Metadata = {
  title: "Public maps",
  description:
    "Browse public thematic maps created by the idomaps community.",
  openGraph: {
    title: "Public maps | idomaps",
    description:
      "Browse public thematic maps created by the idomaps community.",
  },
};

export default function MapsPage() {
  return <MapLibrary />;
}
