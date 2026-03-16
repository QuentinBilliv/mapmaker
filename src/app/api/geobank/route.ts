import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://www.geoboundaries.org/api/current/gbOpen";
const ALLOWED_HOSTS = ["www.geoboundaries.org", "github.com", "raw.githubusercontent.com"];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (url) {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
      return NextResponse.json({ error: "Forbidden host" }, { status: 403 });
    }
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();
    return NextResponse.json(data);
  }

  const iso = req.nextUrl.searchParams.get("iso");
  const adm = req.nextUrl.searchParams.get("adm") ?? "ADM0";

  const target = iso === "ALL"
    ? `${API_BASE}/ALL/${adm}/`
    : `${API_BASE}/${iso}/${adm}/`;

  const res = await fetch(target, { next: { revalidate: 86400 } });
  const data = await res.json();
  return NextResponse.json(data);
}
