"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Copy, Check, RefreshCw, Sparkles, Settings } from "lucide-react";
import { getStoredConfig } from "@/lib/ai-config";

interface PersonaResult {
  title: string;
  label: string;
  description: string;
  vibe: string;
  quote: string;
}

export default function AISummaryCard({ year }: { year: number }) {
  const [style, setStyle] = useState<"poem" | "mbti">("poem");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [persona, setPersona] = useState<PersonaResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(
    async (selectedStyle: "poem" | "mbti", force = false) => {
      console.log("[AI] generate start, style:", selectedStyle, "force:", force);
      setLoading(true);
      setError("");
      setContent(null);
      setPersona(null);

      const config = getStoredConfig();

      try {
        const res = await fetch("/api/ai/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, style: selectedStyle, force, config }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "生成失败" }));
          throw new Error(data.error || "生成失败");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let mbtiBuffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) {
            console.log("[AI] reader done, remaining buffer:", JSON.stringify(buffer));
            // 流结束时处理 buffer 中剩余的数据
            if (buffer) {
              const lines = buffer.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const dataStr = line.slice(6);
                if (dataStr === "[DONE]") continue;
                let data: { chunk?: string; done?: boolean; cached?: boolean; error?: string };
                try {
                  data = JSON.parse(dataStr);
                } catch {
                  continue;
                }
                if (data.error) throw new Error(data.error);
                if (data.done) {
                  console.log("[AI] received done event (from buffer)");
                  streamDone = true;
                  break;
                }
                if (data.chunk && selectedStyle === "poem") {
                  setContent((prev) => (prev ?? "") + data.chunk);
                }
              }
            }
            break;
          }
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;

            let data: { chunk?: string; done?: boolean; cached?: boolean; error?: string };
            try {
              data = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              console.log("[AI] received done event, style:", selectedStyle, "mbtiBuffer length:", mbtiBuffer.length);
              if (selectedStyle === "mbti" && mbtiBuffer) {
                try {
                  const parsed = JSON.parse(mbtiBuffer) as PersonaResult;
                  console.log("[AI] parsed persona:", parsed.title);
                  setPersona(parsed);
                  setContent(null);
                } catch (e) {
                  console.log("[AI] mbti parse error:", e);
                  setContent(mbtiBuffer);
                  setPersona(null);
                }
              }
              streamDone = true;
              break;
            }

            if (data.chunk) {
              if (selectedStyle === "poem") {
                setContent((prev) => {
                  const next = (prev ?? "") + data.chunk;
                  if (next.length <= 50 || next.length % 50 === 0) {
                    console.log("[AI] content length:", next.length);
                  }
                  return next;
                });
              } else {
                mbtiBuffer += data.chunk;
              }
            }
          }
        }

        if (!streamDone && selectedStyle === "mbti" && mbtiBuffer) {
          try {
            const parsed = JSON.parse(mbtiBuffer) as PersonaResult;
            setPersona(parsed);
            setContent(null);
          } catch {
            setContent(mbtiBuffer);
            setPersona(null);
          }
        }
      } catch (err) {
        console.error("[AI] generate error:", err);
        setError(err instanceof Error ? err.message : "生成失败");
      } finally {
        console.log("[AI] finally, content:", content ? "has content" : "null", "error:", error || "none");
        setLoading(false);
      }
    },
    [year]
  );

  const handleCopy = async () => {
    const text = persona
      ? `${persona.title}\n${persona.label}\n${persona.description}\n${persona.quote}`
      : content;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [hasConfig, setHasConfig] = useState(false);
  useEffect(() => {
    setHasConfig(!!getStoredConfig());
  }, []);

  return (
    <Card className="border-2 border-border">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              AI 年度总结
            </h3>
          </div>

          <div className="flex bg-muted rounded-full p-1 gap-1 border-2 border-border">
            <button
              onClick={() => {
                setStyle("poem");
                setError("");
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                style === "poem"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              年度诗篇
            </button>
            <button
              onClick={() => {
                setStyle("mbti");
                setError("");
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                style === "mbti"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              年度风格
            </button>
          </div>
        </div>

        {!hasConfig && !content && !persona && !loading && (
          <div className="text-center py-8 text-muted-foreground space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-primary/40" />
            <p>需要先配置 AI API 才能使用此功能</p>
            <Link href="/settings">
              <Button
                variant="outline"
                className="rounded-full border-2"
              >
                <Settings className="w-4 h-4 mr-1" />
                去设置
              </Button>
            </Link>
          </div>
        )}

        {hasConfig && !content && !persona && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-primary/40" />
            <p>让 AI 根据你的记录，写一段专属的年度感悟</p>
            <Button
              onClick={() => generate(style)}
              className="rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              生成{style === "poem" ? "年度诗篇" : "年度风格"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-10 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              AI 正在创作中，请稍候...
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-2xl border-2 border-destructive/20 text-center">
            {error}
            {error.includes("未配置") && (
              <div className="mt-2">
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="rounded-full border-2">
                    <Settings className="w-4 h-4 mr-1" />
                    去设置
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {content && style === "poem" && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-5 rounded-2xl border-2 border-border whitespace-pre-wrap leading-relaxed text-foreground">
              {content}
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                {copied ? "已复制" : "复制文案"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-2"
                onClick={() => generate(style, true)}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                重新生成
              </Button>
            </div>
          </div>
        )}

        {persona && style === "mbti" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary/5 to-[#FFB347]/10 p-6 rounded-2xl border-2 border-primary/20 text-center space-y-3">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {persona.label}
              </div>
              <h4
                className="text-2xl font-bold text-primary"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {persona.title}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.description}
              </p>
              <div className="flex justify-center gap-2 pt-1">
                {typeof persona.vibe === "string"
                  ? persona.vibe.split("、").map((v) => (
                      <span
                        key={v}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                      >
                        {v.trim()}
                      </span>
                    ))
                  : Array.isArray(persona.vibe)
                    ? persona.vibe.map((v: string) => (
                        <span
                          key={v}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                        >
                          {v.trim()}
                        </span>
                      ))
                    : null}
              </div>
              <p className="text-sm italic text-muted-foreground pt-2 border-t border-border">
                "{persona.quote}"
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                {copied ? "已复制" : "复制文案"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-2"
                onClick={() => generate(style, true)}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                重新生成
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
