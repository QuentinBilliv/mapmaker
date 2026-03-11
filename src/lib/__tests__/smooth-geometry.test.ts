import { describe, it, expect } from "vitest";
import { smoothGeometry } from "../smooth-geometry";

describe("smoothGeometry", () => {
  it("returns geometry unchanged when smoothing is 0", () => {
    const line: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [[0, 0], [1, 1], [2, 0]],
    };
    expect(smoothGeometry(line, 0)).toBe(line);
  });

  it("returns geometry unchanged for negative smoothing", () => {
    const line: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [[0, 0], [1, 1], [2, 0]],
    };
    expect(smoothGeometry(line, -1)).toBe(line);
  });

  it("preserves endpoints of a LineString", () => {
    const line: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [[0, 0], [5, 5], [10, 0]],
    };
    const result = smoothGeometry(line, 0.5) as GeoJSON.LineString;
    expect(result.type).toBe("LineString");
    expect(result.coordinates[0]).toEqual([0, 0]);
    expect(result.coordinates[result.coordinates.length - 1]).toEqual([10, 0]);
  });

  it("produces more points than input for a LineString", () => {
    const line: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [[0, 0], [5, 5], [10, 0]],
    };
    const result = smoothGeometry(line, 0.5) as GeoJSON.LineString;
    expect(result.coordinates.length).toBeGreaterThan(3);
  });

  it("does not smooth a 2-point LineString", () => {
    const line: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [[0, 0], [10, 10]],
    };
    const result = smoothGeometry(line, 1) as GeoJSON.LineString;
    expect(result.coordinates).toEqual([[0, 0], [10, 10]]);
  });

  it("smooths a Polygon ring", () => {
    const polygon: GeoJSON.Geometry = {
      type: "Polygon",
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    };
    const result = smoothGeometry(polygon, 0.5) as GeoJSON.Polygon;
    expect(result.type).toBe("Polygon");
    expect(result.coordinates[0].length).toBeGreaterThan(5);
    const ring = result.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("passes through Point geometry unchanged", () => {
    const point: GeoJSON.Geometry = { type: "Point", coordinates: [1, 2] };
    const result = smoothGeometry(point, 1);
    expect(result).toBe(point);
  });

  it("passes through unsupported geometry types", () => {
    const multi: GeoJSON.Geometry = {
      type: "MultiPoint",
      coordinates: [[0, 0], [1, 1]],
    };
    const result = smoothGeometry(multi, 1);
    expect(result).toBe(multi);
  });

  it("higher smoothing produces smoother curves", () => {
    const line: GeoJSON.Geometry = {
      type: "LineString",
      coordinates: [[0, 0], [5, 5], [10, 0]],
    };
    const low = smoothGeometry(line, 0.1) as GeoJSON.LineString;
    const high = smoothGeometry(line, 1) as GeoJSON.LineString;
    expect(high.coordinates.length).toBeGreaterThanOrEqual(low.coordinates.length);
  });
});
