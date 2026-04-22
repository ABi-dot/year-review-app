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
import { Plus, Pencil, Trash2, Star } from "lucide-react";
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

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  BOOK: "bg-amber-100 text-amber-800 border-amber-200",
  MOVIE: "bg-rose-100 text-rose-800 border-rose-200",
  TV: "bg-purple-100 text-purple-800 border-purple-200",
  GAME: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PLACE: "bg-sky-100 text-sky-800 border-sky-200",
};

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filterType, setFilterType] = useState<ItemType | "ALL">("ALL");
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">我的年度记录</h1>
        <div className="flex gap-2">
          <DoubanImportDialog onSuccess={fetchItems} />
          <Link href="/items/new">
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              添加条目
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as ItemType | "ALL")}
        >
          <SelectTrigger className="w-[180px]">
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
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          还没有记录，点击右上角添加第一条吧
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden group">
              <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                {item.coverUrl ? (
                  <img
                    src={
                      item.coverUrl.includes("doubanio.com")
                        ? `/api/proxy/image?url=${encodeURIComponent(item.coverUrl)}`
                        : item.coverUrl
                    }
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    暂无封面
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge
                    variant="outline"
                    className={ITEM_TYPE_COLORS[item.type]}
                  >
                    {ITEM_TYPE_LABELS[item.type]}
                  </Badge>
                </div>
                {item.rating !== null && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-0.5 rounded text-sm flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {item.rating}
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-tight line-clamp-2">
                  {item.title}
                </CardTitle>
                {item.creator && (
                  <p className="text-xs text-muted-foreground">{item.creator}</p>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {item.finishedAt && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.finishedAt), "yyyy-MM-dd")}
                  </p>
                )}
                {item.review && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.review}
                  </p>
                )}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
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
                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/items/${item.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Pencil className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
