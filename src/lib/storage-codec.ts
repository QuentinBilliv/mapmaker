"use client";

export { fetchAndDecodeMapData } from "./decode-map-data";

export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== "undefined";
}

export async function compressJson(value: unknown): Promise<Blob> {
  const json = JSON.stringify(value);
  if (!isCompressionSupported()) {
    return new Blob([json], { type: "application/json" });
  }
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}
