"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AIRecommendCard from "@/components/ai-recommend-card";
import {
  ChevronLeft,
  Loader2,
  Sparkles,
  TrendingUp,
  User,
  Settings,
} from "lucide-react";
import { getStoredConfig } from "@/lib/ai-config";

interface RecommendItem {
  title: string;
  type: string;
  creator?: string;
  year?: string;
  reason: string;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "MOVIE", label: "电影" },
  { value: "TV", label: "剧集" },
  { value: "BOOK", label: "书籍" },
  { value: "GAME", label: "游戏" },
];

const CACHE_KEY = "year-review-recommendations";

interface CacheData {
  results: Record<string, RecommendItem[]>;
  loadedKeys: string[];
}

function saveCache(results: Record<string, RecommendItem[]>, loadedKeys: Set<string>) {
  const data: CacheData = {
    results,
    loadedKeys: Array.from(loadedKeys),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // 忽略存储失败
  }
}

function loadCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheData;
  } catch {
    return null;
  }
}

export default function RecommendPage() {
  const [tab, setTab] = useState<"hot" | "personal">("hot");
  const [category, setCategory] = useState<string>("ALL");
  const [results, setResults] = useState<Record<string, RecommendItem[]>>({});
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [hasConfig, setHasConfig] = useState(false);
  useEffect(() => {
    setHasConfig(!!getStoredConfig());
  }, []);

  // 页面加载时恢复缓存
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setResults(cached.results);
      setLoadedKeys(new Set(cached.loadedKeys));
    }
  }, []);

  // 状态变化时持久化缓存
  useEffect(() => {
    if (loadedKeys.size > 0) {
      saveCache(results, loadedKeys);
    }
  }, [results, loadedKeys]);

  const getKey = (t: string, c: string) => `${t}-${c}`;

  const currentKey = getKey(tab, category);

  const currentItems = results[currentKey] ?? [];
  const currentHasLoaded = loadedKeys.has(currentKey);

  const fetchRecommend = async (
    type: "hot" | "personal",
    cat: string,
    force = false
  ) => {
    const key = getKey(type, cat);
    if (!force && loadedKeys.has(key) && (results[key]?.length ?? 0) > 0) {
      return;
    }

    setLoading(true);
    setError("");

    const config = getStoredConfig();

    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category: cat === "ALL" ? undefined : cat,
          config,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "推荐生成失败");

      const items: RecommendItem[] = data.recommendations ?? [];

      // 按类型分发到各个分类 key，同时合并到“全部”
      setResults((prev) => {
        const next: Record<string, RecommendItem[]> = { ...prev, [key]: items };
        const byType: Record<string, RecommendItem[]> = {};
        for (const item of items) {
          const typeKey = getKey(type, item.type);
          if (!byType[typeKey]) byType[typeKey] = [];
          byType[typeKey].push(item);
        }
        for (const [typeKey, typeItems] of Object.entries(byType)) {
          next[typeKey] = typeItems;
        }
        if (cat !== "ALL") {
          const allKey = getKey(type, "ALL");
          const existingAll = next[allKey] ?? prev[allKey] ?? [];
          const seen = new Set(existingAll.map((i) => i.title));
          const merged = [...existingAll, ...items.filter((i) => !seen.has(i.title))];
          next[allKey] = merged;
        }
        return next;
      });

      setLoadedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        for (const item of items) {
          next.add(getKey(type, item.type));
        }
        if (cat !== "ALL" && items.length > 0) {
          next.add(getKey(type, "ALL"));
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "推荐生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newTab: "hot" | "personal") => {
    setTab(newTab);
    setError("");
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* 头部 */}
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
              AI 推荐
            </h1>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex bg-muted rounded-full p-1 gap-1 border-2 border-border mb-6">
          <button
            onClick={() => handleTabChange("hot")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all ${
              tab === "hot"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            热门推荐
          </button>
          <button
            onClick={() => handleTabChange("personal")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all ${
              tab === "personal"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4" />
            猜你喜欢
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_OPTIONS.map((opt) => (
            <Badge
              key={opt.value}
              variant={category === opt.value ? "default" : "outline"}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs ${
                category === opt.value
                  ? ""
                  : "hover:border-primary/40 hover:text-primary"
              }`}
              onClick={() => handleCategoryChange(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>

        {/* 内容区 */}
        {!currentHasLoaded && !loading && !error && (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            {!hasConfig ? (
              <>
                <Sparkles className="w-10 h-10 mx-auto text-primary/40" />
                <p className="text-lg">需要先配置 AI API 才能使用此功能</p>
                <Link href="/settings">
                  <Button
                    variant="outline"
                    className="rounded-full border-2"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    去设置
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Sparkles className="w-10 h-10 mx-auto text-primary/40" />
                <p className="text-lg">
                  {tab === "hot"
                    ? "看看最近大家都在看什么"
                    : "让 AI 根据你的口味推荐作品"}
                </p>
                <Button
                  onClick={() => fetchRecommend(tab, category, true)}
                  className="rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {tab === "hot" ? "获取热门推荐" : "获取个性推荐"}
                </Button>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-16 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">AI 正在挑选作品... </p>
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

        {currentHasLoaded && currentItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                为你找到 {currentItems.length} 部作品
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-2"
                onClick={() => fetchRecommend(tab, category, true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                换一批
              </Button>
            </div>
            {currentItems.map((item, idx) => (
              <AIRecommendCard key={idx} item={item} />
            ))}
          </div>
        )}

        {currentHasLoaded && currentItems.length === 0 && !loading && !error && (
          <div className="text-center py-12 text-muted-foreground">
            没有获取到推荐结果，请重试
          </div>
        )}
      </div>
    </div>
  );
}
