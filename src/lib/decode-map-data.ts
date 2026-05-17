const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

export async function decodeMapBuffer<T>(buf: Uint8Array): Promise<T> {
  const isGzip = buf.length >= 2 && buf[0] === GZIP_MAGIC_0 && buf[1] === GZIP_MAGIC_1;
  let text: string;
  if (isGzip) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("gzip decompression unavailable in this runtime");
    }
    text = await new Response(
      new Blob([buf as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).text();
  } else {
    text = new TextDecoder().decode(buf);
  }
  return JSON.parse(text) as T;
}

export async function fetchAndDecodeMapData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to load map data: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return decodeMapBuffer<T>(buf);
}
