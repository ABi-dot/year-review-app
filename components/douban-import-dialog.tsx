"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Loader2, Zap, Globe, CheckCircle2, AlertCircle } from "lucide-react";

interface ScrapeProgress {
  category: string;
  page: number;
  itemsSoFar: number;
  totalCategories: number;
  currentCategoryIndex: number;
  totalItems?: number;
  totalPages?: number;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
}

export default function DoubanImportDialog({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState<"rss" | "scrape">("rss");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ScrapeProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleImport = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(null);

    try {
      if (mode === "rss") {
        const res = await fetch("/api/import/douban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId.trim(), mode }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "导入失败");

        setResult(data);
        if (onSuccess) onSuccess();
      } else {
        const res = await fetch("/api/import/douban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId.trim(), mode }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "导入失败");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              console.log("[import] received:", data.type, data);
              if (data.type === "progress") {
                setProgress(data);
                await new Promise((r) => setTimeout(r, 0));
              } else if (data.type === "complete") {
                setResult(data);
                if (onSuccess) onSuccess();
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "导入失败") {
                console.error("[import] error:", e.message);
                throw e;
              }
              console.warn("[import] parse error, line:", line);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = progress
    ? progress.totalPages
      ? Math.round(
          ((progress.currentCategoryIndex +
            Math.min(progress.page / progress.totalPages, 1)) /
            progress.totalCategories) *
            100
        )
      : Math.round(
          ((progress.currentCategoryIndex + 0.5) / progress.totalCategories) *
            100
        )
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <Download className="w-4 h-4 mr-1" />
            导入豆瓣
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md rounded-3xl border-2 border-border p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-[#FFE4C4]/40 to-[#FFB347]/20 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              导入豆瓣收藏
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {mode === "rss"
                ? "通过 RSS 快速导入最近的书/影/游收藏记录（约 10-20 条）"
                : "全量抓取所有收藏记录，包括历史数据（可能需要几分钟）"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="douban-user" className="font-semibold text-sm">
              豆瓣用户 ID
            </Label>
            <Input
              id="douban-user"
              placeholder="如：ahbei"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-xl border-2 focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              在你的豆瓣个人主页 URL 中，如 douban.com/people/ahbei
            </p>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-sm">导入模式</Label>
            <div className="flex gap-2 bg-muted rounded-full p-1 border-2 border-border">
              <button
                type="button"
                onClick={() => setMode("rss")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all duration-200 ${
                  mode === "rss"
                    ? "bg-white text-primary shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="w-4 h-4" />
                RSS 快速
              </button>
              <button
                type="button"
                onClick={() => setMode("scrape")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all duration-200 ${
                  mode === "scrape"
                    ? "bg-white text-[#E67E22] shadow-sm border border-[#FFB347]/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="w-4 h-4" />
                全量抓取
              </button>
            </div>
          </div>

          {mode === "scrape" && (
            <div className="text-sm text-[#B45309] bg-[#FFFBEB] p-4 rounded-2xl border-2 border-[#FDE68A]">
              <span className="font-semibold">温馨提示：</span>全量抓取会遍历你的所有收藏页面，可能需要 1-3
              分钟。过程中请保持页面打开，不要关闭弹窗。
            </div>
          )}

          {loading && mode === "scrape" && progress && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-2xl border-2 border-border">
              <div className="flex justify-between text-sm font-medium">
                <span>
                  正在抓取：{progress.category}（第 {progress.page} 页）
                </span>
                <span className="text-muted-foreground">
                  {progress.currentCategoryIndex + 1} / {progress.totalCategories}
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-3 overflow-hidden border border-border">
                <div
                  className="bg-gradient-to-r from-primary to-[#FFB347] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                已获取 {progress.itemsSoFar} 条记录
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-4 rounded-2xl border-2 border-destructive/20">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="text-sm bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                导入完成
              </div>
              <p className="text-emerald-700">共解析 {result.total} 条记录</p>
              <p className="text-emerald-600 font-medium">成功导入 {result.created} 条</p>
              {result.skipped > 0 && (
                <p className="text-emerald-600/70">
                  跳过 {result.skipped} 条（已存在）
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-full border-2"
          >
            关闭
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !userId.trim()}
            className="rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
          >
            {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {loading ? "导入中..." : "开始导入"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
