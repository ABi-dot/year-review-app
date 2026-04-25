"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ItemType, ITEM_TYPE_LABELS } from "@/lib/types";
import { Star, ChevronLeft, BookOpen, Film, Tv, Gamepad2, MapPin, Trophy } from "lucide-react";
import { format } from "date-fns";

interface TimelineItem {
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

interface MonthGroup {
  month: number;
  monthLabel: string;
  items: TimelineItem[];
}

interface TimelineData {
  year: number;
  summary: Record<string, number>;
  months: MonthGroup[];
}

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  BOOK: "bg-[#FFB347]/20 text-[#E67E22] border-[#FFB347]/40",
  MOVIE: "bg-[#FF6B9D]/20 text-[#E05588] border-[#FF6B9D]/40",
  TV: "bg-[#C084FC]/20 text-[#9B59B6] border-[#C084FC]/40",
  GAME: "bg-[#4ADE80]/20 text-[#27AE60] border-[#4ADE80]/40",
  PLACE: "bg-[#60A5FA]/20 text-[#2980B9] border-[#60A5FA]/40",
};

const TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  BOOK: <BookOpen className="w-5 h-5" />,
  MOVIE: <Film className="w-5 h-5" />,
  TV: <Tv className="w-5 h-5" />,
  GAME: <Gamepad2 className="w-5 h-5" />,
  PLACE: <MapPin className="w-5 h-5" />,
};

export default function TimelinePage() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [year]);

  const fetchTimeline = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/timeline?year=${year}`);
    const json = await res.json();
    setData(json);
    setIsLoading(false);
  };

  const summaryEntries = data
    ? (Object.entries(data.summary).filter(([_, count]) => count > 0) as [
        ItemType,
        number
      ][])
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-full">
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
            </Link>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              年度时间线
            </h1>
            <Link href="/summary">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10"
              >
                <Trophy className="w-4 h-4 mr-1" />
                年度总结
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setYear((y) => y - 1)}
            >
              {year - 1}
            </Button>
            <span
              className="text-lg font-bold px-2"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {year}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= new Date().getFullYear()}
            >
              {year + 1}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-lg">
            加载中...
          </div>
        ) : !data || data.months.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {year} 年还没有记录
          </div>
        ) : (
          <>
            {/* 年度统计摘要 */}
            <div className="mb-10">
              <h2
                className="text-lg text-muted-foreground mb-4 text-center"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {year} 年，你一共体验了
              </h2>
              <div className="flex flex-wrap justify-center gap-4">
                {summaryEntries.map(([type, count]) => (
                  <Card
                    key={type}
                    className="w-36 border-2 border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                  >
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <div
                        className={`p-2.5 rounded-full bg-white shadow-sm ${
                          ITEM_TYPE_COLORS[type].split(" ")[1]
                        }`}
                      >
                        {TYPE_ICONS[type]}
                      </div>
                      <div className="text-2xl font-extrabold">{count}</div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {ITEM_TYPE_LABELS[type]}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 时间线 */}
            <div className="pl-8 border-l-[3px] border-dashed border-primary/30">
              {data.months.map((monthGroup) => (
                <div key={monthGroup.month} className="relative mb-12">
                  {/* 月份标记 */}
                  <div className="absolute -left-8 top-0 -translate-x-1/2 w-5 h-5 rounded-full bg-primary shadow-lg shadow-primary/40 border-4 border-background" />
                  <h3
                    className="text-2xl font-bold mb-5 -mt-1"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {monthGroup.monthLabel}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {monthGroup.items.length} 条
                    </span>
                  </h3>

                  {/* 条目列表 */}
                  <div className="space-y-4">
                    {monthGroup.items.map((item) => (
                      <Link key={item.id} href={`/items/${item.id}/edit`}>
                        <Card className="overflow-hidden hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border-2 border-border">
                          <div className="flex gap-4 p-4">
                            {/* 封面 */}
                            <div className="w-20 h-28 flex-shrink-0 bg-muted overflow-hidden">
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
                                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                  暂无封面
                                </div>
                              )}
                            </div>

                            {/* 信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold line-clamp-2 text-base">
                                  {item.title}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className={
                                    ITEM_TYPE_COLORS[item.type] +
                                    " flex-shrink-0 rounded-full text-[10px]"
                                  }
                                >
                                  {ITEM_TYPE_LABELS[item.type]}
                                </Badge>
                              </div>

                              {item.creator && (
                                <p className="text-sm text-muted-foreground mb-1">
                                  {item.creator}
                                </p>
                              )}

                              {item.rating !== null && (
                                <div className="flex items-center gap-1 text-sm mb-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="font-bold">{item.rating}</span>
                                </div>
                              )}

                              {item.review && (
                                <p className="text-sm text-muted-foreground line-clamp-2 italic">
                                  &quot;{item.review}&quot;
                                </p>
                              )}

                              {item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.tags.map((tag) => (
                                    <Badge
                                      key={tag.id}
                                      variant="secondary"
                                      className="text-xs rounded-full px-2 py-0.5"
                                    >
                                      {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
