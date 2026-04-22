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
import { Download, Loader2 } from "lucide-react";

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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1" />
            导入豆瓣
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导入豆瓣收藏</DialogTitle>
          <DialogDescription>
            {mode === "rss"
              ? "通过 RSS 快速导入最近的书/影/游收藏记录（约 10-20 条）"
              : "全量抓取所有收藏记录，包括历史数据（可能需要几分钟）"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="douban-user">豆瓣用户 ID</Label>
            <Input
              id="douban-user"
              placeholder="如：ahbei"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              在你的豆瓣个人主页 URL 中，如 douban.com/people/ahbei
            </p>
          </div>

          <div className="space-y-2">
            <Label>导入模式</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "rss" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("rss")}
              >
                RSS（快速，最近条目）
              </Button>
              <Button
                type="button"
                variant={mode === "scrape" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("scrape")}
              >
                全量抓取（较慢）
              </Button>
            </div>
          </div>

          {mode === "scrape" && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
              全量抓取会遍历你的所有收藏页面，可能需要 1-3
              分钟。过程中请保持页面打开，不要关闭弹窗。
            </div>
          )}

          {loading && mode === "scrape" && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  正在抓取：{progress.category}（第 {progress.page} 页）
                </span>
                <span className="text-muted-foreground">
                  {progress.currentCategoryIndex + 1} / {progress.totalCategories}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                已获取 {progress.itemsSoFar} 条记录
              </p>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          {result && (
            <div className="text-sm bg-muted p-3 rounded space-y-1">
              <p>共解析 {result.total} 条记录</p>
              <p className="text-green-600">成功导入 {result.created} 条</p>
              {result.skipped > 0 && (
                <p className="text-muted-foreground">
                  跳过 {result.skipped} 条（已存在）
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            关闭
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !userId.trim()}
          >
            {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {loading ? "导入中..." : "开始导入"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
