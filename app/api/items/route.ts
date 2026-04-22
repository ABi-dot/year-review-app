import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as ItemType | null;

  const items = await prisma.item.findMany({
    where: type ? { type } : undefined,
    include: { tags: true },
    orderBy: { finishedAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, originalTitle, creator, type, rating, review, finishedAt, coverUrl, externalId, externalUrl, tagIds } = body;

  const item = await prisma.item.create({
    data: {
      title,
      originalTitle: originalTitle || null,
      creator: creator || null,
      type,
      rating: rating ? parseInt(rating) : null,
      review: review || null,
      finishedAt: finishedAt ? new Date(finishedAt) : null,
      coverUrl: coverUrl || null,
      externalId: externalId || null,
      externalUrl: externalUrl || null,
      tags: tagIds?.length ? { connect: tagIds.map((id: string) => ({ id })) } : undefined,
    },
    include: { tags: true },
  });

  return NextResponse.json(item, { status: 201 });
}
