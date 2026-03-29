import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "../mapmaker-format";
import type { MapData, LayerData, FeatureData, GroupData } from "../types";

const MAP: MapData = {
  id: "test",
  title: "Test Map",
  description: "A test map",
  tags: ["history", "borders"],
  license: "CC BY",
  center: [2.3, 46.5],
  zoom: 5,
};

const LAYER: LayerData = { id: "layer-1", name: "Main", visible: true, order: 0 };

const POLYGON: FeatureData = {
  id: "f1",
  type: "polygon",
  layerId: "layer-1",
  label: "France",
  description: "Western Europe",

  color: "#3b82f6",
  opacity: 0.8,
  order: 0,
  smoothing: 0.5,
  strokeWidth: 3,
  lineStyle: "solid",
  lineDecoration: "crosses",
  decorationSpacing: 40,
  fillPattern: "stripes-diagonal",
  shapeOrigin: "rectangle",
  geometry: { type: "Polygon", coordinates: [[[2, 46], [3, 46], [3, 47], [2, 47], [2, 46]]] },
};

const POLYLINE: FeatureData = {
  id: "f2",
  type: "polyline",
  layerId: "layer-1",
  label: "Route",
  description: "",

  color: "#ef4444",
  opacity: 1,
  order: 1,
  smoothing: 0,
  strokeWidth: 5,
  lineStyle: "dash-medium",
  arrowStyle: "forward",
  lineDecoration: "ticks",
  decorationSpacing: 30,
  geometry: { type: "LineString", coordinates: [[2, 46], [3, 47]] },
};

const POINT: FeatureData = {
  id: "f3",
  type: "point",
  layerId: "layer-1",
  label: "Paris",
  description: "Capital of France",

  color: "#000000",
  opacity: 1,
  order: 2,
  size: 2,
  shape: "star",
  customSvg: undefined,
  borderColor: "#ffffff",
  borderWidth: 3,
  geometry: { type: "Point", coordinates: [2.35, 48.86] },
};

const TEXT: FeatureData = {
  id: "f4",
  type: "text",
  layerId: "layer-1",
  label: "Label",
  description: "",

  color: "#1a1a1a",
  opacity: 1,
  order: 3,
  textContent: "Hello World",
  fontSize: 32,
  fontFamily: "serif",
  textBorderEnabled: true,
  textBorderColor: "#ffffff",
  textBorderWidth: 2,
  geometry: { type: "Point", coordinates: [2.3, 46.5] },
};

const GROUP: GroupData = { id: "g1", label: "Group 1", order: 0 };

describe("mapmaker-format round-trip", () => {
  it("round-trips all feature types without data loss", () => {
    const features = [POLYGON, POLYLINE, POINT, TEXT];
    const json = serialize(MAP, [LAYER], features, "osm", [GROUP]);
    const result = deserialize(json);

    expect(result.map.title).toBe(MAP.title);
    expect(result.map.description).toBe(MAP.description);
    expect(result.map.tags).toEqual(MAP.tags);
    expect(result.map.license).toBe(MAP.license);
    expect(result.map.center).toEqual(MAP.center);
    expect(result.map.zoom).toBe(MAP.zoom);
    expect(result.baseMapId).toBe("osm");
    expect(result.layers).toEqual([LAYER]);
    expect(result.groups).toEqual([GROUP]);
    expect(result.features).toHaveLength(4);
  });

  it("preserves polygon properties", () => {
    const json = serialize(MAP, [LAYER], [POLYGON], "osm");
    const [f] = deserialize(json).features;
    expect(f.type).toBe("polygon");
    if (f.type !== "polygon") throw new Error("unexpected type");
    expect(f.smoothing).toBe(POLYGON.smoothing);
    expect(f.strokeWidth).toBe(POLYGON.strokeWidth);
    expect(f.lineStyle).toBe(POLYGON.lineStyle);
    expect(f.lineDecoration).toBe(POLYGON.lineDecoration);
    expect(f.decorationSpacing).toBe(POLYGON.decorationSpacing);
    expect(f.fillPattern).toBe(POLYGON.fillPattern);
    expect(f.shapeOrigin).toBe(POLYGON.shapeOrigin);
  });

  it("preserves polyline properties", () => {
    const json = serialize(MAP, [LAYER], [POLYLINE], "osm");
    const [f] = deserialize(json).features;
    expect(f.type).toBe("polyline");
    if (f.type !== "polyline") throw new Error("unexpected type");
    expect(f.arrowStyle).toBe("forward");
    expect(f.lineStyle).toBe("dash-medium");
    expect(f.lineDecoration).toBe("ticks");
    expect(f.decorationSpacing).toBe(30);
  });

  it("preserves point properties", () => {
    const json = serialize(MAP, [LAYER], [POINT], "osm");
    const [f] = deserialize(json).features;
    expect(f.type).toBe("point");
    if (f.type !== "point") throw new Error("unexpected type");
    expect(f.size).toBe(2);
    expect(f.shape).toBe("star");
    expect(f.borderColor).toBe("#ffffff");
    expect(f.borderWidth).toBe(3);
  });

  it("preserves text properties", () => {
    const json = serialize(MAP, [LAYER], [TEXT], "osm");
    const [f] = deserialize(json).features;
    expect(f.type).toBe("text");
    if (f.type !== "text") throw new Error("unexpected type");
    expect(f.textContent).toBe("Hello World");
    expect(f.fontSize).toBe(32);
    expect(f.fontFamily).toBe("serif");
    expect(f.textBorderEnabled).toBe(true);
    expect(f.textBorderColor).toBe("#ffffff");
    expect(f.textBorderWidth).toBe(2);
  });

  it("preserves common fields (label, description, color, opacity)", () => {
    const json = serialize(MAP, [LAYER], [POLYGON], "osm");
    const [f] = deserialize(json).features;
    expect(f.label).toBe("France");
    expect(f.description).toBe("Western Europe");
    expect(f.color).toBe("#3b82f6");
    expect(f.opacity).toBe(0.8);
  });

  it("rejects invalid JSON", () => {
    expect(() => deserialize("{not json")).toThrow("Invalid JSON");
  });

  it("rejects missing FeatureCollection type", () => {
    expect(() => deserialize(JSON.stringify({ type: "Feature" }))).toThrow();
  });

  it("filters features with mismatched geometry/type", () => {
    const json = serialize(MAP, [LAYER], [POLYGON], "osm");
    const parsed = JSON.parse(json);
    parsed.features[0].properties["mapmaker:type"] = "polyline";
    const result = deserialize(JSON.stringify(parsed));
    expect(result.features).toHaveLength(0);
  });

  it("filters features with invalid layerId", () => {
    const json = serialize(MAP, [LAYER], [POLYGON], "osm");
    const parsed = JSON.parse(json);
    parsed.features[0].properties["mapmaker:layerId"] = "nonexistent";
    const result = deserialize(JSON.stringify(parsed));
    expect(result.features).toHaveLength(0);
  });

  it("falls back to osm for unknown base map", () => {
    const json = serialize(MAP, [LAYER], [], "unknown-map-id");
    const result = deserialize(json);
    expect(result.baseMapId).toBe("osm");
  });
});
