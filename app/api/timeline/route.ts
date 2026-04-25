import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const items = await prisma.item.findMany({
    where: {
      finishedAt: {
        gte: startOfYear,
        lt: endOfYear,
      },
    },
    include: { tags: true },
    orderBy: { finishedAt: "desc" },
  });

  // 年度统计
  const summary: Record<string, number> = {
    BOOK: 0,
    MOVIE: 0,
    TV: 0,
    GAME: 0,
    PLACE: 0,
  };
  for (const item of items) {
    if (summary[item.type] !== undefined) {
      summary[item.type]++;
    }
  }

  // 按月份分组
  const monthMap = new Map<number, typeof items>();
  for (const item of items) {
    const month = item.finishedAt!.getMonth() + 1;
    if (!monthMap.has(month)) {
      monthMap.set(month, []);
    }
    monthMap.get(month)!.push(item);
  }

  const months = Array.from(monthMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([month, monthItems]) => ({
      month,
      monthLabel: `${month}月`,
      items: monthItems,
    }));

  return NextResponse.json({ year, summary, months });
}
