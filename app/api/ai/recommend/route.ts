import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callAI, isAIConfigured } from "@/lib/ai";
import { buildPersonalRecommendPrompt } from "@/lib/ai-prompts";
import { fetchAllCharts } from "@/lib/douban-chart";
import { searchDouban } from "@/lib/douban-search";
import type { DoubanSearchResult } from "@/lib/douban-search";

export async function POST(request: NextRequest) {
  let body: {
    type?: "hot" | "personal";
    category?: string;
    config?: { endpoint: string; apiKey: string; model: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type ?? "hot";
  const category = body.category;
  const config = body.config;

  if (!["hot", "personal"].includes(type)) {
    return NextResponse.json({ error: "type 必须是 hot 或 personal" }, { status: 400 });
  }

  try {
    if (type === "hot") {
      const charts = await fetchAllCharts();
      let hotItems = [
        ...charts.MOVIE.map((i) => ({ ...i, type: "MOVIE" as const })),
        ...charts.TV.map((i) => ({ ...i, type: "TV" as const })),
        ...charts.BOOK.map((i) => ({ ...i, type: "BOOK" as const })),
      ];

      if (category && ["MOVIE", "TV", "BOOK", "GAME"].includes(category)) {
        hotItems = hotItems.filter((i) => i.type === category);
      }

      if (hotItems.length === 0) {
        return NextResponse.json(
          { error: "未能获取热门榜单数据" },
          { status: 500 }
        );
      }

      // 如果是"全部"，把各类型穿插混合，避免前面类型垄断
      if (!category || category === "ALL") {
        const byType: Record<string, typeof hotItems> = {};
        for (const item of hotItems) {
          if (!byType[item.type]) byType[item.type] = [];
          byType[item.type].push(item);
        }
        const mixed: typeof hotItems = [];
        let idx = 0;
        const types = Object.keys(byType);
        while (mixed.length < 10) {
          let added = false;
          for (const t of types) {
            if (byType[t][idx]) {
              mixed.push(byType[t][idx]);
              if (mixed.length >= 10) break;
              added = true;
            }
          }
          if (!added) break;
          idx++;
        }
        hotItems = mixed;
      } else {
        hotItems = hotItems.slice(0, 10);
      }

      const typeLabels: Record<string, string> = {
        MOVIE: "电影",
        TV: "剧集",
        BOOK: "书籍",
        GAME: "游戏",
      };

      const recommendations = hotItems.map((item) => ({
        title: item.title,
        type: item.type,
        creator: item.creator,
        year: "",
        cover: (item as any).cover,
        reason: item.creator
          ? `${item.creator} · 豆瓣${item.rating}分`
          : `豆瓣${item.rating}分热门${typeLabels[item.type] || item.type}`,
      }));

      return NextResponse.json({ recommendations, source: "douban-chart" });
    } else {
      if (!isAIConfigured(config)) {
        return NextResponse.json(
          { error: "AI API 未配置，请在设置页配置" },
          { status: 400 }
        );
      }
      const userItems = await prisma.item.findMany({
        where: { rating: { gte: 4 } },
        include: { tags: true },
        orderBy: { finishedAt: "desc" },
        take: 30,
      });

      if (userItems.length === 0) {
        return NextResponse.json(
          { error: "还没有足够的评分记录，先去标记一些喜欢的作品吧" },
          { status: 400 }
        );
      }

      // 拉取全部已有作品标题，让 LLM 知道哪些不能推荐
      const allItems = await prisma.item.findMany({
        select: { title: true },
      });
      const allTitles = allItems.map((i) => i.title).filter((t): t is string => !!t);

      const promptItems = userItems.map((item) => ({
        title: item.title,
        type: item.type,
        creator: item.creator,
        rating: item.rating,
        review: item.review,
        tags: item.tags.map((t) => t.name),
        finishedAt: item.finishedAt?.toISOString() ?? null,
      }));

      const prompt = buildPersonalRecommendPrompt(promptItems, allTitles, 8);

      const content = await callAI(
        [
          {
            role: "system",
            content: "你是一位文化推荐官，只输出 JSON 数组，不要任何额外说明。",
          },
          { role: "user", content: prompt },
        ],
        { temperature: 0.8, maxTokens: 32768, jsonMode: true },
        config
      );

      console.log("[Recommend] AI raw content:", content.slice(0, 500));
      const recommendations = parseJSON(content);
      console.log("[Recommend] parsed count:", recommendations.length);

      if (recommendations.length === 0) {
        return NextResponse.json(
          { error: "AI 返回格式不正确，请重试" },
          { status: 500 }
        );
      }

      const enriched = await Promise.allSettled(
        (recommendations as Record<string, unknown>[]).map(async (rec) => {
          const title = typeof rec.title === "string" ? rec.title : "";
          const rawType = typeof rec.type === "string" ? rec.type : "";
          const type = ["MOVIE", "TV", "BOOK"].includes(rawType)
            ? (rawType as "MOVIE" | "TV" | "BOOK")
            : undefined;
          if (!title || !type) return rec;
          try {
            const results = await searchDouban(title, type);
            if (results.length > 0 && results[0].cover) {
              return { ...rec, cover: results[0].cover };
            }
          } catch {
            // 忽略搜索失败
          }
          return rec;
        })
      );

      const finalRecommendations = enriched.map((r) =>
        r.status === "fulfilled" ? r.value : (r.reason as Record<string, unknown>)
      );

      return NextResponse.json({ recommendations: finalRecommendations, source: "ai-personal" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "推荐生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseJSON(text: string): unknown[] {
  try {
    const clean = text.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && parsed !== null) {
      // AI 可能返回了单个对象而不是数组，将其包装为数组
      const keys = Object.keys(parsed as Record<string, unknown>);
      if (keys.includes("title") || keys.includes("type")) {
        return [parsed];
      }
      if (Array.isArray((parsed as Record<string, unknown>).recommendations)) {
        return (parsed as Record<string, unknown>).recommendations as unknown[];
      }
    }
    return [];
  } catch {
    return [];
  }
}
