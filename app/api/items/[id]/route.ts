import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { tags: true, bookDetail: true, movieDetail: true, gameDetail: true, placeDetail: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, originalTitle, creator, type, rating, review, finishedAt, coverUrl, externalId, externalUrl, tagIds } = body;

  const item = await prisma.item.update({
    where: { id },
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
      tags: { set: tagIds?.length ? tagIds.map((tid: string) => ({ id: tid })) : [] },
    },
    include: { tags: true },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
