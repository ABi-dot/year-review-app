import { prisma } from "@/lib/prisma";
import {
  fetchDoubanRSS,
  parseRSSItems,
  parseDoubanItems,
  supplementMovieDetails,
  ParsedDoubanItem,
} from "@/lib/douban";

async function importItems(items: ParsedDoubanItem[]) {
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const whereConditions: Record<string, unknown>[] = [];
    if (item.externalUrl) {
      whereConditions.push({ externalUrl: item.externalUrl });
    }
    if (item.externalId) {
      whereConditions.push({ externalId: item.externalId });
    }

    if (whereConditions.length === 0) {
      skipped++;
      continue;
    }

    const existing = await prisma.item.findFirst({
      where: { OR: whereConditions },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.item.create({
      data: {
        title: item.title,
        originalTitle: item.originalTitle || null,
        type: item.type,
        externalUrl: item.externalUrl,
        externalId: item.externalId || null,
        finishedAt: item.finishedAt,
        rating: item.rating,
        review: item.review,
        coverUrl: item.coverUrl,
      },
    });

    created++;
  }

  return { created, skipped };
}

export async function runRSSImport(userId: string): Promise<{
  success: boolean;
  total: number;
  created: number;
  skipped: number;
  error?: string;
}> {
  try {
    if (!userId || !/^[A-Za-z0-9._-]+$/.test(userId)) {
      return { success: false, total: 0, created: 0, skipped: 0, error: "豆瓣用户 ID 格式无效" };
    }

    const xml = await fetchDoubanRSS(userId);
    const rssItems = parseRSSItems(xml);
    const parsedItems = parseDoubanItems(rssItems);
    await supplementMovieDetails(parsedItems);
    const { created, skipped } = await importItems(parsedItems);

    console.log(`[AutoImport] RSS import done: ${created} created, ${skipped} skipped, ${parsedItems.length} total`);
    return { success: true, total: parsedItems.length, created, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : "导入失败";
    console.error("[AutoImport] RSS import error:", message);
    return { success: false, total: 0, created: 0, skipped: 0, error: message };
  }
}
