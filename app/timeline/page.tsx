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
  BOOK: "bg-amber-100 text-amber-800 border-amber-200",
  MOVIE: "bg-rose-100 text-rose-800 border-rose-200",
  TV: "bg-purple-100 text-purple-800 border-purple-200",
  GAME: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PLACE: "bg-sky-100 text-sky-800 border-sky-200",
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
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">年度时间线</h1>
          <Link href="/summary">
            <Button variant="outline" size="sm">
              <Trophy className="w-4 h-4 mr-1" />
              年度总结
            </Button>
          </Link>
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
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : !data || data.months.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {year} 年还没有记录
        </div>
      ) : (
        <>
          {/* 年度统计摘要 */}
          <div className="mb-10">
            <h2 className="text-lg font-medium text-muted-foreground mb-4 text-center">
              {year} 年，你一共体验了
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {summaryEntries.map(([type, count]) => (
                <Card
                  key={type}
                  className="w-36 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <div className={ITEM_TYPE_COLORS[type].split(" ")[0] + " p-2 rounded-full"}>
                      {TYPE_ICONS[type]}
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">
                      {ITEM_TYPE_LABELS[type]}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 时间线 */}
          <div className="pl-6 border-l-2 border-muted">
            {data.months.map((monthGroup) => (
              <div key={monthGroup.month} className="relative mb-10">
                {/* 月份标记 */}
                <div className="absolute -left-6 top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                <h3 className="text-xl font-bold mb-4 -mt-1">
                  {monthGroup.monthLabel}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {monthGroup.items.length} 条
                  </span>
                </h3>

                {/* 条目列表 */}
                <div className="space-y-4">
                  {monthGroup.items.map((item) => (
                    <Link key={item.id} href={`/items/${item.id}/edit`}>
                      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex gap-4 p-4">
                          {/* 封面 */}
                          <div className="w-20 h-28 flex-shrink-0 bg-muted rounded overflow-hidden">
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
                              <h4 className="font-semibold line-clamp-2">
                                {item.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className={ITEM_TYPE_COLORS[item.type] + " flex-shrink-0"}
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
                                <span>{item.rating}</span>
                              </div>
                            )}

                            {item.review && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.review}
                              </p>
                            )}

                            {item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="text-xs"
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
  );
}
