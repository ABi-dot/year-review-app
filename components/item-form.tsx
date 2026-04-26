"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemType, ITEM_TYPE_LABELS } from "@/lib/types";
import { Loader2, Search } from "lucide-react";

interface SearchResult {
  title: string;
  originalTitle?: string;
  creator?: string;
  year?: string;
  cover?: string;
  url?: string;
  type: ItemType;
  externalId?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface ItemFormData {
  title: string;
  originalTitle: string;
  creator: string;
  type: ItemType;
  rating: string;
  review: string;
  finishedAt: string;
  coverUrl: string;
  externalId: string;
  externalUrl: string;
  tagIds: string[];
}


export default function ItemForm({
  itemId,
  initialData,
}: {
  itemId?: string;
  initialData?: Partial<ItemFormData>;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchIndex, setSearchIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<ItemFormData>({
    title: "",
    originalTitle: "",
    creator: "",
    type: "MOVIE",
    rating: "",
    review: "",
    finishedAt: "",
    coverUrl: "",
    externalId: "",
    externalUrl: "",
    tagIds: [],
    ...initialData,
  });

  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  const updateField = useCallback(
    (field: keyof ItemFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleTitleChange = (value: string) => {
    updateField("title", value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 1) {
      setSearchOpen(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      const query = formRef.current.title.trim();
      if (query.length < 1) {
        setSearchOpen(false);
        return;
      }
      const currentType = formRef.current.type;
      const typeParam = currentType === "GAME" || currentType === "PLACE" ? "" : currentType;
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/search/douban?q=${encodeURIComponent(query)}${typeParam ? `&type=${typeParam}` : ""}`
        );
        const data = (await res.json()) as { results: SearchResult[] };
        setSearchResults(data.results.slice(0, 6));
        setSearchOpen(data.results.length > 0);
        setSearchIndex(-1);
      } catch {
        setSearchResults([]);
        setSearchOpen(false);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const selectResult = (result: SearchResult) => {
    setForm((prev) => ({
      ...prev,
      title: result.title,
      originalTitle: result.originalTitle || prev.originalTitle,
      creator: result.creator || prev.creator,
      coverUrl: result.cover || prev.coverUrl,
      externalId: result.externalId || prev.externalId,
      externalUrl: result.url || prev.externalUrl,
      type: result.type,
    }));
    setSearchOpen(false);
    setSearchResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchIndex((i) => (i + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchIndex((i) => (i - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchIndex >= 0 && searchResults[searchIndex]) {
        selectResult(searchResults[searchIndex]);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  }, []);

  const createTag = async () => {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    if (res.ok) {
      const tag = await res.json();
      setTags((prev) => [...prev, tag]);
      setNewTagName("");
      setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, tag.id] }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const fd = new FormData();
    fd.append("file", selected);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setForm((prev) => ({ ...prev, coverUrl: data.url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...form,
      rating: form.rating ? parseInt(form.rating) : null,
    };

    const url = itemId ? `/api/items/${itemId}` : "/api/items";
    const method = itemId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">类型</Label>
          <Select
            value={form.type}
            onValueChange={(v) => updateField("type", v as ItemType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rating">评分 (1-10)</Label>
          <Input
            id="rating"
            type="number"
            min={1}
            max={10}
            value={form.rating}
            onChange={(e) => updateField("rating", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2" ref={searchContainerRef}>
        <Label htmlFor="title">名称 *</Label>
        <div className="relative">
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchResults.length > 0) setSearchOpen(true);
            }}
            placeholder="输入名称搜索豆瓣..."
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {searchLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          {searchOpen && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border-2 border-border rounded-xl shadow-lg overflow-hidden">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                    idx === searchIndex ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setSearchIndex(idx)}
                >
                  {result.cover && (
                    <img
                      src={`/api/proxy/image?url=${encodeURIComponent(result.cover)}`}
                      alt=""
                      className="w-10 h-14 object-cover flex-shrink-0 bg-muted"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {result.title}
                      </span>
                      {result.year && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({result.year})
                        </span>
                      )}
                    </div>
                    {result.creator && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.creator}
                      </p>
                    )}
                    <Badge variant="outline" className="mt-1 text-[10px] rounded-full">
                      {ITEM_TYPE_LABELS[result.type]}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="originalTitle">原名</Label>
        <Input
          id="originalTitle"
          value={form.originalTitle}
          onChange={(e) => updateField("originalTitle", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="creator">
          {form.type === "BOOK"
            ? "作者"
            : form.type === "MOVIE" || form.type === "TV"
            ? "导演"
            : form.type === "GAME"
            ? "开发商"
            : "备注"}
        </Label>
        <Input
          id="creator"
          value={form.creator}
          onChange={(e) => updateField("creator", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="finishedAt">完成日期</Label>
        <Input
          id="finishedAt"
          type="date"
          value={form.finishedAt}
          onChange={(e) => updateField("finishedAt", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover">封面图</Label>
        <Input id="cover" type="file" accept="image/*" onChange={handleFileChange} />
        {form.coverUrl && (
          <img
            src={
              form.coverUrl.includes("doubanio.com")
                ? `/api/proxy/image?url=${encodeURIComponent(form.coverUrl)}`
                : form.coverUrl
            }
            alt="cover preview"
            className="w-32 h-48 object-cover rounded-md mt-2"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>标签</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant={form.tagIds.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTag(tag.id)}
              style={
                tag.color && form.tagIds.includes(tag.id)
                  ? { backgroundColor: tag.color }
                  : {}
              }
            >
              {tag.name}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="新标签名称"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={createTag}>
            添加标签
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review">短评</Label>
        <Textarea
          id="review"
          rows={4}
          value={form.review}
          onChange={(e) => updateField("review", e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : itemId ? "更新" : "添加"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/")}>
          取消
        </Button>
      </div>
    </form>
  );
}
