"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  Settings,
  Save,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  getStoredConfig,
  setStoredConfig,
  clearStoredConfig,
} from "@/lib/ai-config";

const PRESETS = [
  {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  {
    name: "OpenRouter (Claude)",
    endpoint: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-sonnet-4",
  },
  {
    name: "Anthropic 原生",
    endpoint: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-7-20251001",
  },
];

export default function SettingsPage() {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    const cfg = getStoredConfig();
    if (cfg) {
      setEndpoint(cfg.endpoint);
      setApiKey(cfg.apiKey);
      setModel(cfg.model);
      setHasConfig(true);
    }
  }, []);

  const handleSave = () => {
    if (!endpoint.trim() || !apiKey.trim() || !model.trim()) return;
    setStoredConfig({ endpoint: endpoint.trim(), apiKey: apiKey.trim(), model: model.trim() });
    setHasConfig(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearStoredConfig();
    setEndpoint("");
    setApiKey("");
    setModel("");
    setHasConfig(false);
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setEndpoint(preset.endpoint);
    setModel(preset.model);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-xl">
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-8">
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
            设置
          </h1>
        </div>

        <Card className="border-2 border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">AI API 配置</h2>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                选择预设提供商，或手动填写配置：
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-2 text-xs"
                    onClick={() => applyPreset(preset)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">API Endpoint</Label>
                <Input
                  id="endpoint"
                  placeholder="如：https://api.deepseek.com/v1"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="rounded-xl border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-xxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="rounded-xl border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="如：deepseek-chat"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-xl border-2"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!endpoint.trim() || !apiKey.trim() || !model.trim()}
                className="rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow flex-1"
              >
                {saved ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {saved ? "已保存" : "保存配置"}
              </Button>
              {hasConfig && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="rounded-full border-2"
                >
                  清除
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-4 rounded-2xl">
              <p className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                配置仅保存在本机浏览器中（localStorage），不会上传到服务器。
              </p>
              <p className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                支持 DeepSeek（OpenAI 兼容格式）、OpenRouter、Anthropic 原生协议。
              </p>
              <p className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                如果同时配置了 .env 环境变量，界面配置会优先使用。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
