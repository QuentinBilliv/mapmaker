import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";

export const PHYSICAL_STYLE: StyleSpecification = {
  version: 8,
  name: "MapMaker Physical",
  sources: {
    "stamen-terrain": {
      type: "raster",
      tiles: [
        "https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen Design</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>',
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#f8f4f0",
      },
    },
    {
      id: "terrain",
      type: "raster",
      source: "stamen-terrain",
      paint: {
        "raster-opacity": 0.9,
      },
    },
  ],
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
};
