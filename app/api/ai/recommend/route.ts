import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callAI, isAIConfigured } from "@/lib/ai";
import { buildPersonalRecommendPrompt } from "@/lib/ai-prompts";
import { fetchAllCharts } from "@/lib/douban-chart";
import { searchDouban } from "@/lib/douban-search";
import type { DoubanSearchResult } from "@/lib/douban-search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "hot";
  const category = searchParams.get("category") ?? "ALL";

  if (!["hot", "personal"].includes(type)) {
    return NextResponse.json({ error: "type 必须是 hot 或 personal" }, { status: 400 });
  }

  try {
    const cached = await prisma.recommendation.findUnique({
      where: { type_category: { type, category } },
    });

    if (cached) {
      const items = JSON.parse(cached.items) as Record<string, unknown>[];
      return NextResponse.json({
        recommendations: items,
        source: cached.source,
        cachedAt: cached.updatedAt.toISOString(),
      });
    }

    // 如果是 ALL 且没有直接缓存，尝试合并各分类缓存
    if (category === "ALL") {
      const cats = ["MOVIE", "TV", "BOOK", "GAME"];
      const merged: Record<string, unknown>[] = [];
      let foundSource = "";
      let latestUpdate: Date | null = null;

      for (const cat of cats) {
        const sub = await prisma.recommendation.findUnique({
          where: { type_category: { type, category: cat } },
        });
        if (sub) {
          const items = JSON.parse(sub.items) as Record<string, unknown>[];
          const seen = new Set(merged.map((i) => i.title));
          for (const item of items) {
            if (!seen.has(item.title)) merged.push(item);
          }
          if (!foundSource) foundSource = sub.source;
          if (!latestUpdate || sub.updatedAt > latestUpdate) {
            latestUpdate = sub.updatedAt;
          }
        }
      }

      if (merged.length > 0) {
        return NextResponse.json({
          recommendations: merged,
          source: foundSource,
          cachedAt: latestUpdate?.toISOString(),
        });
      }
    }

    return NextResponse.json({ error: "暂无缓存" }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "读取缓存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
  const category = body.category ?? "ALL";
  const config = body.config;

  if (!["hot", "personal"].includes(type)) {
    return NextResponse.json({ error: "type 必须是 hot 或 personal" }, { status: 400 });
  }

  try {
    let recommendations: Record<string, unknown>[] = [];
    let source = "";

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

      recommendations = hotItems.map((item) => ({
        title: item.title,
        type: item.type,
        creator: item.creator,
        year: "",
        cover: (item as any).cover,
        reason: item.creator
          ? `${item.creator} · 豆瓣${item.rating}分`
          : `豆瓣${item.rating}分热门${typeLabels[item.type] || item.type}`,
      }));
      source = "douban-chart";
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
      console.log(`[Recommend] Prompt length: ${prompt.length} chars, allTitles count: ${allTitles.length}`);

      const content = await callAI(
        [
          {
            role: "system",
            content:
              "你是一位文化推荐官。你的任务是直接输出合法的 JSON 数组文本，禁止输出任何分析过程、解释、前言、后缀。不要以 markdown 代码块（```json）包裹，直接输出纯字符串形式的 JSON。",
          },
          { role: "user", content: prompt + "\n\n【重要】直接输出 JSON 数组，不要有任何其他文字。" },
        ],
        { temperature: 0.8, maxTokens: 4096, jsonMode: true },
        config
      );

      console.log("[Recommend] AI raw content:", content.slice(0, 800));
      const parsed = parseJSON(content);
      console.log("[Recommend] parsed count:", parsed.length);

      if (parsed.length === 0) {
        return NextResponse.json(
          { error: "AI 返回格式不正确，请重试" },
          { status: 500 }
        );
      }

      const parsedRecs = parsed as Record<string, unknown>[];
      const enriched = await Promise.allSettled(
        parsedRecs.map(async (rec) => {
          const title = typeof rec.title === "string" ? rec.title : "";
          const rawType = typeof rec.type === "string" ? rec.type : "";
          const itemType = ["MOVIE", "TV", "BOOK"].includes(rawType)
            ? (rawType as "MOVIE" | "TV" | "BOOK")
            : undefined;
          if (!title || !itemType) return rec;
          try {
            const results = await searchDouban(title, itemType);
            if (results.length > 0 && results[0].cover) {
              return { ...rec, cover: results[0].cover };
            }
          } catch {
            // 忽略搜索失败
          }
          return rec;
        })
      );

      recommendations = enriched.map((r) =>
        r.status === "fulfilled" ? r.value : (r.reason as Record<string, unknown>)
      );
      source = "ai-personal";
    }

    // 写入数据库缓存
    await prisma.recommendation.upsert({
      where: { type_category: { type, category } },
      update: { items: JSON.stringify(recommendations), source },
      create: { type, category, items: JSON.stringify(recommendations), source },
    });

    return NextResponse.json({ recommendations, source });
  } catch (err) {
    const message = err instanceof Error ? err.message : "推荐生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractJSON(text: string): string {
  // 先去掉 markdown 代码块
  let clean = text.replace(/```json\s*|\s*```/g, "").trim();

  // 如果整段是 JSON，直接返回
  try {
    JSON.parse(clean);
    return clean;
  } catch {
    // 继续尝试提取
  }

  // 尝试找第一个 [ 或 { 到最后一个 ] 或 }
  const firstBracket = clean.search(/[\[{]/);
  if (firstBracket !== -1) {
    const lastBracket = clean.search(/[\]}](?!.*[\]}])/);
    if (lastBracket !== -1) {
      clean = clean.slice(firstBracket, lastBracket + 1);
      try {
        JSON.parse(clean);
        return clean;
      } catch {
        // 继续尝试
      }
    }
  }

  // 尝试提取 recommendations 数组
  const recMatch = clean.match(/"recommendations"\s*:\s*(\[[\s\S]*?\])(\s*[,}]|$)/);
  if (recMatch) {
    try {
      JSON.parse(recMatch[1]);
      return recMatch[1];
    } catch {
      // 继续尝试
    }
  }

  return "";
}

function parseJSON(text: string): unknown[] {
  const jsonStr = extractJSON(text);
  if (!jsonStr) return [];

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && parsed !== null) {
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
