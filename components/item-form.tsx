"use client";

import { useState, useEffect, useCallback } from "react";
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

      <div className="space-y-2">
        <Label htmlFor="title">名称 *</Label>
        <Input
          id="title"
          required
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
        />
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
