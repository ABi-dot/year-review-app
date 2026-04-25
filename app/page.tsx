"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemType, ITEM_TYPE_LABELS } from "@/lib/types";
import { Plus, Pencil, Trash2, Star, LayoutGrid, List, Trophy } from "lucide-react";
import { format } from "date-fns";
import DoubanImportDialog from "@/components/douban-import-dialog";

interface Item {
  id: string;
  type: ItemType;
  title: string;
  originalTitle: string | null;
  creator: string | null;
  coverUrl: string | null;
  rating: number | null;
  review: string | null;
  finishedAt: string | null;
  createdAt: string;
  tags: { id: string; name: string; color: string | null }[];
}

interface MonthGroup {
  month: number;
  monthLabel: string;
  items: Item[];
}

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  BOOK: "bg-[#FFB347]/20 text-[#E67E22] border-[#FFB347]/40",
  MOVIE: "bg-[#FF6B9D]/20 text-[#E05588] border-[#FF6B9D]/40",
  TV: "bg-[#C084FC]/20 text-[#9B59B6] border-[#C084FC]/40",
  GAME: "bg-[#4ADE80]/20 text-[#27AE60] border-[#4ADE80]/40",
  PLACE: "bg-[#60A5FA]/20 text-[#2980B9] border-[#60A5FA]/40",
};

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filterType, setFilterType] = useState<ItemType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [filterType]);

  const fetchItems = async () => {
    setIsLoading(true);
    const url =
      filterType === "ALL" ? "/api/items" : `/api/items?type=${filterType}`;
    const res = await fetch(url);
    const data = await res.json();
    setItems(data);
    setIsLoading(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    fetchItems();
  };

  // 按月份分组（时间线模式用）
  const monthGroups: MonthGroup[] = (() => {
    const map = new Map<number, Item[]>();
    for (const item of items) {
      if (!item.finishedAt) continue;
      const d = new Date(item.finishedAt);
      const key = d.getFullYear() * 100 + d.getMonth();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([key, groupItems]) => {
        const year = Math.floor(key / 100);
        const month = (key % 100) + 1;
        return {
          month: key,
          monthLabel: `${year}年${month}月`,
          items: groupItems,
        };
      });
  })();

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            我的年度记录
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            记录每一份体验与感动
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/summary">
            <Button
              variant="outline"
              className="rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10"
            >
              <Trophy className="w-4 h-4 mr-1" />
              年度总结
            </Button>
          </Link>
          <DoubanImportDialog onSuccess={fetchItems} />
          <Link href="/items/new">
            <Button className="rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              <Plus className="w-4 h-4 mr-1" />
              添加条目
            </Button>
          </Link>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-8">
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as ItemType | "ALL")}
        >
          <SelectTrigger className="w-[180px] rounded-full border-2">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部分类</SelectItem>
            {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex bg-muted rounded-full p-1 gap-1 border-2 border-border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3 rounded-full"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            封面
          </Button>
          <Button
            variant={viewMode === "timeline" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3 rounded-full"
            onClick={() => setViewMode("timeline")}
          >
            <List className="w-4 h-4 mr-1" />
            时间线
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground text-lg">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-2">还没有记录</p>
          <p>点击右上角添加第一条吧 ✨</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {items.map((item, idx) => (
            <Card
              key={item.id}
              className="overflow-hidden group rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="relative aspect-[2/3] bg-muted overflow-hidden rounded-2xl m-3">
                {item.coverUrl ? (
                  <img
                    src={
                      item.coverUrl.includes("doubanio.com")
                        ? `/api/proxy/image?url=${encodeURIComponent(item.coverUrl)}`
                        : item.coverUrl
                    }
                    alt={item.title}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm rounded-2xl">
                    暂无封面
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <Badge
                    variant="outline"
                    className={ITEM_TYPE_COLORS[item.type] + " rounded-full text-[10px] px-2 py-0.5 backdrop-blur-sm bg-white/80"}
                  >
                    {ITEM_TYPE_LABELS[item.type]}
                  </Badge>
                </div>
                {item.rating !== null && (
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {item.rating}
                  </div>
                )}
              </div>
              <CardHeader className="pb-2 px-4 pt-3">
                <CardTitle
                  className="text-sm leading-tight line-clamp-2 font-bold"
                  style={{ fontFamily: "var(--font-sans), sans-serif" }}
                >
                  {item.title}
                </CardTitle>
                {item.creator && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.creator}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-4 space-y-2">
                {item.finishedAt && (
                  <p className="text-xs text-muted-foreground font-medium">
                    {format(new Date(item.finishedAt), "yyyy.MM.dd")}
                  </p>
                )}
                {item.review && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    "{item.review}"
                  </p>
                )}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-[10px] rounded-full px-2 py-0.5"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <Link href={`/items/${item.id}/edit`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full text-xs h-7"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive rounded-full h-7 w-7 p-0"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="pl-8 border-l-[3px] border-dashed border-primary/30">
          {monthGroups.map((group) => (
            <div key={group.month} className="relative mb-12">
              <div className="absolute -left-8 top-0 -translate-x-1/2 w-5 h-5 rounded-full bg-primary shadow-lg shadow-primary/40 border-4 border-background" />
              <h3
                className="text-2xl font-bold mb-5 -mt-1"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {group.monthLabel}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {group.items.length} 条
                </span>
              </h3>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <Link key={item.id} href={`/items/${item.id}/edit`}>
                    <Card className="overflow-hidden hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer rounded-2xl border-2 border-border">
                      <div className="flex gap-4 p-4">
                        <div className="w-20 h-28 flex-shrink-0 bg-muted rounded-xl overflow-hidden">
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold line-clamp-2 text-base">
                              {item.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={ITEM_TYPE_COLORS[item.type] + " flex-shrink-0 rounded-full text-[10px]"}
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
                              "{item.review}"
                            </p>
                          )}
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.tags.map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant="secondary"
                                  className="text-[10px] rounded-full px-2 py-0.5"
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
      )}
    </div>
  );
}
