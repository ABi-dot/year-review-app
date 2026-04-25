import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callAIStream, isAIConfigured } from "@/lib/ai";
import { buildPoemPrompt, buildPersonaPrompt } from "@/lib/ai-prompts";

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function streamCachedContent(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += 4) {
    chunks.push(content.slice(i, i + 4));
  }

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(encodeSSE({ chunk })));
        await new Promise((r) => setTimeout(r, 15));
      }
      controller.enqueue(encoder.encode(encodeSSE({ done: true, cached: true })));
      controller.close();
    },
  });
}

export async function POST(request: NextRequest) {
  let body: {
    year?: number;
    style?: "poem" | "mbti";
    force?: boolean;
    config?: { endpoint: string; apiKey: string; model: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year ?? new Date().getFullYear();
  const style = body.style ?? "poem";
  const force = body.force ?? false;
  const config = body.config;

  if (!["poem", "mbti"].includes(style)) {
    return NextResponse.json({ error: "style 必须是 poem 或 mbti" }, { status: 400 });
  }

  if (!isAIConfigured(config)) {
    return NextResponse.json(
      { error: "AI API 未配置，请在设置页配置" },
      { status: 400 }
    );
  }

  let cachedContent: string | null = null;

  if (!force) {
    try {
      const cached = await prisma.yearSummary.findUnique({
        where: { year_style: { year, style } },
      });
      if (cached?.content) {
        cachedContent = cached.content;
      }
    } catch {
      // 缓存查询失败继续走生成流程
    }
  }

  if (cachedContent) {
    return new Response(streamCachedContent(cachedContent), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  let items;
  try {
    items = await prisma.item.findMany({
      where: {
        finishedAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      include: { tags: true },
      orderBy: { finishedAt: "desc" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "数据库查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: `${year} 年还没有记录，无法生成总结` },
      { status: 400 }
    );
  }

  const promptItems = items.map((item) => ({
    title: item.title,
    type: item.type,
    creator: item.creator,
    rating: item.rating,
    review: item.review,
    tags: item.tags.map((t) => t.name),
    finishedAt: item.finishedAt?.toISOString() ?? null,
  }));

  const prompt =
    style === "poem"
      ? buildPoemPrompt(promptItems, year)
      : buildPersonaPrompt(promptItems, year);

  const messages = [
    { role: "system" as const, content: "你是一位擅长文字创作的文化写作者。" },
    { role: "user" as const, content: prompt },
  ];

  let aiStream: ReadableStream<string>;
  try {
    aiStream = await callAIStream(
      messages,
      {
        temperature: 0.9,
        maxTokens: 32768,
        jsonMode: style === "mbti",
      },
      config
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 调用失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const encoder = new TextEncoder();
  let fullContent = "";

  const outputStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const reader = aiStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += value;
          controller.enqueue(encoder.encode(encodeSSE({ chunk: value })));
        }

        controller.enqueue(encoder.encode(encodeSSE({ done: true, cached: false })));
        controller.close();

        // 流结束后异步写入缓存
        try {
          await prisma.yearSummary.upsert({
            where: { year_style: { year, style } },
            update: { content: fullContent },
            create: { year, style, content: fullContent },
          });
        } catch {
          // 缓存写入失败不影响主流程
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI 生成失败";
        controller.enqueue(encoder.encode(encodeSSE({ error: message })));
        controller.close();
      }
    },
  });

  return new Response(outputStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
