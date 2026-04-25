import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const monthlyCounts = Array(12).fill(0);
  const typeItems: Record<string, typeof items> = {
    BOOK: [],
    MOVIE: [],
    TV: [],
    GAME: [],
    PLACE: [],
  };

  for (const item of items) {
    if (summary[item.type] !== undefined) {
      summary[item.type]++;
    }
    if (item.finishedAt) {
      const month = item.finishedAt.getMonth();
      monthlyCounts[month]++;
    }
    if (typeItems[item.type]) {
      typeItems[item.type].push(item);
    }
  }

  // 年度之最
  const ratedItems = items.filter((i) => i.rating !== null);
  const topRated =
    ratedItems.length > 0
      ? ratedItems.reduce((max, item) =>
          (item.rating ?? 0) > (max.rating ?? 0) ? item : max
        )
      : null;
  const lowestRated =
    ratedItems.length > 0
      ? ratedItems.reduce((min, item) =>
          (item.rating ?? 5) < (min.rating ?? 5) ? item : min
        )
      : null;

  return NextResponse.json({
    year,
    totalItems: items.length,
    summary,
    monthlyCounts,
    topRated,
    lowestRated,
    typeItems,
  });
}
