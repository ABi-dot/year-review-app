import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchDoubanRSS,
  parseRSSItems,
  parseDoubanItems,
  supplementMovieDetails,
  scrapeDoubanCollections,
  ParsedDoubanItem,
} from "@/lib/douban";

async function importItems(items: ParsedDoubanItem[]) {
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = await prisma.item.findFirst({
      where: { externalUrl: item.externalUrl },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, mode = "rss" } = body;

    if (!userId || !/^[A-Za-z0-9._-]+$/.test(userId)) {
      return NextResponse.json(
        { error: "豆瓣用户 ID 格式无效" },
        { status: 400 }
      );
    }

    if (mode === "rss") {
      const xml = await fetchDoubanRSS(userId);
      const rssItems = parseRSSItems(xml);
      const parsedItems = parseDoubanItems(rssItems);
      await supplementMovieDetails(parsedItems);
      const { created, skipped } = await importItems(parsedItems);

      return NextResponse.json({
        success: true,
        mode: "rss",
        total: parsedItems.length,
        created,
        skipped,
      });
    }

    if (mode === "scrape") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => {
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
          };

          try {
            const items = await scrapeDoubanCollections(
              userId,
              async (progress) => {
                send({ type: "progress", ...progress });
                // 让出事件循环，确保数据被刷新到网络层
                await new Promise((r) => setTimeout(r, 50));
              }
            );

            const { created, skipped } = await importItems(items);

            send({
              type: "complete",
              success: true,
              mode: "scrape",
              total: items.length,
              created,
              skipped,
            });

            controller.close();
          } catch (err) {
            send({
              type: "error",
              error: err instanceof Error ? err.message : "导入失败",
            });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    return NextResponse.json({ error: "不支持的导入模式" }, { status: 400 });
  } catch (err) {
    console.error("Douban import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "导入失败" },
      { status: 500 }
    );
  }
}
