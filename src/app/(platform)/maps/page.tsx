import type { Metadata } from "next";
import MapLibrary from "@/components/maps/MapLibrary";

export const metadata: Metadata = {
  title: "Public maps",
  description:
    "Browse public thematic maps created by the idomap community.",
  openGraph: {
    title: "Public maps | idomap",
    description:
      "Browse public thematic maps created by the idomap community.",
  },
};

export default function MapsPage() {
  return <MapLibrary />;
}
