"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ItemType, ITEM_TYPE_LABELS } from "@/lib/types";
import {
  BookOpen,
  Film,
  Tv,
  Gamepad2,
  MapPin,
  ChevronLeft,
  Download,
  Loader2,
} from "lucide-react";
import { toPng } from "html-to-image";

interface SummaryItem {
  id: string;
  type: ItemType;
  title: string;
  originalTitle: string | null;
  creator: string | null;
  coverUrl: string | null;
  rating: number | null;
  review: string | null;
  finishedAt: string | null;
  tags: { id: string; name: string; color: string | null }[];
}

interface SummaryData {
  year: number;
  totalItems: number;
  summary: Record<string, number>;
  monthlyCounts: number[];
  topRated: SummaryItem | null;
  lowestRated: SummaryItem | null;
  typeItems: Record<string, SummaryItem[]>;
}

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  BOOK: <BookOpen className="w-5 h-5" />,
  MOVIE: <Film className="w-5 h-5" />,
  TV: <Tv className="w-5 h-5" />,
  GAME: <Gamepad2 className="w-5 h-5" />,
  PLACE: <MapPin className="w-5 h-5" />,
};

const TYPE_COLORS: Record<ItemType, string> = {
  BOOK: "text-amber-400",
  MOVIE: "text-rose-400",
  TV: "text-purple-400",
  GAME: "text-emerald-400",
  PLACE: "text-sky-400",
};

const TYPE_BG_COLORS: Record<ItemType, string> = {
  BOOK: "bg-amber-500",
  MOVIE: "bg-rose-500",
  TV: "bg-purple-500",
  GAME: "bg-emerald-500",
  PLACE: "bg-sky-500",
};

const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

export default function SummaryPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSummary();
  }, [year]);

  const fetchSummary = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/summary?year=${year}`);
    const json = await res.json();
    setData(json);
    setIsLoading(false);
  };

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#0f172a",
      });
      const link = document.createElement("a");
      link.download = `${year}年度回顾.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }, [year]);

  const maxMonthly = Math.max(...(data?.monthlyCounts ?? [0]), 1);
  const activeTypes = (Object.entries(data?.summary ?? {}) as [ItemType, number][]).filter(
    ([_, count]) => count > 0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* 页面头部 */}
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">年度总结</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setYear((y) => y - 1)}
            >
              {year - 1}
            </Button>
            <span className="text-lg font-semibold px-2">{year}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= new Date().getFullYear()}
            >
              {year + 1}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">加载中...</div>
        ) : !data || data.totalItems === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {year} 年还没有记录
          </div>
        ) : (
          <>
            {/* 导出按钮 */}
            <div className="flex justify-center mb-6">
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                {exporting ? "导出中..." : "导出长图"}
              </Button>
            </div>

            {/* 网页版展示 */}
            <div className="space-y-8 mb-8">
              {/* 年度统计 */}
              <div className="flex flex-wrap justify-center gap-4">
                {activeTypes.map(([type, count]) => (
                  <Card key={type} className="w-32">
                    <CardContent className="p-4 flex flex-col items-center gap-1">
                      <div className={TYPE_COLORS[type]}>{TYPE_ICONS[type]}</div>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground">
                        {ITEM_TYPE_LABELS[type]}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 月度分布 */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">月度分布</h3>
                  <div className="flex items-end gap-2 h-40">
                    {data.monthlyCounts.map((count, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="text-xs text-muted-foreground">
                          {count > 0 ? count : ""}
                        </div>
                        <div
                          className="w-full bg-primary/80 rounded-t"
                          style={{
                            height: `${(count / maxMonthly) * 100}%`,
                            minHeight: count > 0 ? "4px" : "0",
                          }}
                        />
                        <div className="text-[10px] text-muted-foreground">
                          {MONTH_LABELS[idx]}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 分类封面墙 */}
              {activeTypes.map(([type]) => {
                const items = data.typeItems[type];
                if (!items || items.length === 0) return null;
                return (
                  <div key={type}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className={TYPE_COLORS[type]}>{TYPE_ICONS[type]}</span>
                      {ITEM_TYPE_LABELS[type]}
                      <span className="text-sm text-muted-foreground font-normal">
                        ({items.length})
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="w-[calc(20%-8px)] min-w-[80px] aspect-[2/3] bg-muted rounded overflow-hidden relative"
                        >
                          {item.rating === 5 && (
                            <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-[10px] font-bold text-center py-0.5 z-10">
                              推荐
                            </div>
                          )}
                          {item.coverUrl ? (
                            <img
                              src={
                                item.coverUrl.includes("doubanio.com")
                                  ? `/api/proxy/image?url=${encodeURIComponent(
                                      item.coverUrl
                                    )}`
                                  : item.coverUrl
                              }
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center p-1">
                              {item.title}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 长图导出模板（隐藏但可截图） */}
            <div className="flex justify-center">
              <div
                ref={exportRef}
                className="w-[400px] bg-slate-900 text-white p-6 space-y-6"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {/* 标题 */}
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-1">这是</p>
                  <h2 className="text-4xl font-bold tracking-tight">{year}</h2>
                </div>

                {/* 年度数字 */}
                <div className="flex justify-center gap-4">
                  {activeTypes.map(([type, count]) => (
                    <div key={type} className="text-center">
                      <div className={`text-xl font-bold ${TYPE_COLORS[type]}`}>
                        {count}
                      </div>
                      <div className="text-xs text-slate-400">
                        {ITEM_TYPE_LABELS[type]}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 月度分布 */}
                <div>
                  <div className="flex items-end gap-[2px] h-24">
                    {data.monthlyCounts.map((count, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-slate-700 rounded-t"
                        style={{
                          height: `${(count / maxMonthly) * 100}%`,
                          minHeight: count > 0 ? "2px" : "0",
                          backgroundColor:
                            count > 0 ? "#3b82f6" : "#334155",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>1月</span>
                    <span>12月</span>
                  </div>
                </div>

                {/* 分类封面墙 */}
                {activeTypes.map(([type]) => {
                  const items = data.typeItems[type];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-1 h-4 rounded ${TYPE_BG_COLORS[type]}`} />
                        <span className="text-sm font-semibold">
                          {ITEM_TYPE_LABELS[type]}
                        </span>
                        <span className="text-xs text-slate-400">({items.length})</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="aspect-[2/3] bg-slate-800 rounded overflow-hidden relative"
                          >
                            {item.rating === 5 && (
                              <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-[8px] font-bold text-center py-[1px] z-10">
                                推荐
                              </div>
                            )}
                            {item.coverUrl ? (
                              <img
                                src={
                                  item.coverUrl.includes("doubanio.com")
                                    ? `/api/proxy/image?url=${encodeURIComponent(
                                        item.coverUrl
                                      )}`
                                    : item.coverUrl
                                }
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-500 text-center p-1 leading-tight">
                                {item.title}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 底部 */}
                <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
                  <p>年度回顾 · {year}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
