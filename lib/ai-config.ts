import { AIConfig } from "./ai";

const STORAGE_KEY = "ai-config-v1";

export function getStoredConfig(): AIConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AIConfig;
    if (parsed.endpoint && parsed.apiKey && parsed.model) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredConfig(config: AIConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearStoredConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isStoredConfigValid(): boolean {
  const cfg = getStoredConfig();
  return !!cfg;
}
