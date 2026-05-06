"use client";

const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

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

export async function fetchAndDecodeMapData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to load map data: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const isGzip = buf.length >= 2 && buf[0] === GZIP_MAGIC_0 && buf[1] === GZIP_MAGIC_1;
  let text: string;
  if (isGzip) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Browser does not support gzip decompression. Please update your browser.");
    }
    text = await new Response(
      new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).text();
  } else {
    text = new TextDecoder().decode(buf);
  }
  return JSON.parse(text) as T;
}
