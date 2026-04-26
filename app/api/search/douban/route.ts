import { NextRequest, NextResponse } from "next/server";
import { searchDouban } from "@/lib/douban-search";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") as "MOVIE" | "TV" | "BOOK" | null;

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchDouban(q, type ?? undefined);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
