import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://www.geoboundaries.org/api/current/gbOpen";
const ALLOWED_HOSTS = new Set(["www.geoboundaries.org", "github.com", "raw.githubusercontent.com"]);
const ISO_RE = /^[A-Z]{3}$/;
const ADM_RE = /^ADM[0-5]$/;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return NextResponse.json({ error: "Forbidden host" }, { status: 403 });
    }
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  }

  const iso = req.nextUrl.searchParams.get("iso");
  const adm = req.nextUrl.searchParams.get("adm") ?? "ADM0";

  if (!iso || (iso !== "ALL" && !ISO_RE.test(iso))) {
    return NextResponse.json({ error: "Invalid ISO code" }, { status: 400 });
  }
  if (!ADM_RE.test(adm)) {
    return NextResponse.json({ error: "Invalid ADM level" }, { status: 400 });
  }

  const target = `${API_BASE}/${iso}/${adm}/`;

  const res = await fetch(target, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
