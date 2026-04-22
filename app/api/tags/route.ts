import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, color } = body;

  const tag = await prisma.tag.create({
    data: {
      name,
      color: color || null,
    },
  });

  return NextResponse.json(tag, { status: 201 });
}
