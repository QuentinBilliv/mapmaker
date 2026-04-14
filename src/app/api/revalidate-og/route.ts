import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { mapId } = (await request.json()) as { mapId?: string };
    if (!mapId || typeof mapId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    revalidatePath(`/maps/${mapId}/opengraph-image`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
