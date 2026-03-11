import { describe, it, expect } from "vitest";
import { parseGeometry, geometryTypeToFeatureType } from "../geojson";

describe("parseGeometry", () => {
  it("parses valid GeoJSON geometry", () => {
    const raw = JSON.stringify({ type: "Point", coordinates: [2.3, 48.8] });
    const result = parseGeometry(raw);
    expect(result).toEqual({ type: "Point", coordinates: [2.3, 48.8] });
  });

  it("returns null for invalid JSON", () => {
    expect(parseGeometry("{not valid json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseGeometry("")).toBeNull();
  });

  it("parses polygon geometry", () => {
    const polygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    };
    expect(parseGeometry(JSON.stringify(polygon))).toEqual(polygon);
  });

  it("parses linestring geometry", () => {
    const line = { type: "LineString", coordinates: [[0, 0], [1, 1], [2, 0]] };
    expect(parseGeometry(JSON.stringify(line))).toEqual(line);
  });
});

describe("geometryTypeToFeatureType", () => {
  it("maps Polygon to polygon", () => {
    expect(geometryTypeToFeatureType("Polygon")).toBe("polygon");
  });

  it("maps MultiPolygon to polygon", () => {
    expect(geometryTypeToFeatureType("MultiPolygon")).toBe("polygon");
  });

  it("maps LineString to polyline", () => {
    expect(geometryTypeToFeatureType("LineString")).toBe("polyline");
  });

  it("maps MultiLineString to polyline", () => {
    expect(geometryTypeToFeatureType("MultiLineString")).toBe("polyline");
  });

  it("maps Point to point", () => {
    expect(geometryTypeToFeatureType("Point")).toBe("point");
  });

  it("maps MultiPoint to point", () => {
    expect(geometryTypeToFeatureType("MultiPoint")).toBe("point");
  });

  it("defaults unknown types to point", () => {
    expect(geometryTypeToFeatureType("GeometryCollection")).toBe("point");
    expect(geometryTypeToFeatureType("")).toBe("point");
  });
});
