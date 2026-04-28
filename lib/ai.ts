interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

function getEnvConfig(): AIConfig | null {
  const endpoint = process.env.AI_API_ENDPOINT;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!endpoint || !apiKey || !model) return null;
  return { endpoint, apiKey, model };
}

function resolveConfig(override?: AIConfig): AIConfig | null {
  if (override?.endpoint && override?.apiKey && override?.model) {
    return override;
  }
  return getEnvConfig();
}

function isAnthropic(endpoint: string): boolean {
  return endpoint.includes("anthropic.com");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 300000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAICompatible(
  config: AIConfig,
  messages: AIMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const url = config.endpoint.endsWith("/chat/completions")
    ? config.endpoint
    : `${config.endpoint.replace(/\/$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.maxTokens ?? 2048,
  };

  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  console.log(`[AI] Request → ${url}, model=${config.model}, max_tokens=${body.max_tokens}`);

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "User-Agent": "claude-cli/2.1.117",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  console.log(`[AI] Response status=${res.status}, length=${rawText.length}`);

  if (!res.ok) {
    throw new Error(`AI API error ${res.status}: ${rawText || "Empty response"}`);
  }

  if (!rawText.trim()) {
    throw new Error("AI API returned empty response body");
  }

  let data: {
    choices?: [{ message?: { content?: string; reasoning_content?: string } }];
    error?: { message?: string };
  };
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`AI API returned invalid JSON: ${rawText.slice(0, 200)}`);
  }

  if (data.error) {
    throw new Error(data.error.message || "AI API error");
  }

  const msg = data.choices?.[0]?.message;
  const content = msg?.content || msg?.reasoning_content;
  if (!content) {
    console.error("[AI] Empty content, raw response:", rawText.slice(0, 1000));
    throw new Error("AI returned empty content");
  }
  return content;
}

async function callAnthropic(
  config: AIConfig,
  messages: AIMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const url = config.endpoint.endsWith("/messages")
    ? config.endpoint
    : `${config.endpoint.replace(/\/$/, "")}/messages`;

  const systemMsg = messages.find((m) => m.role === "system");
  const userAssistantMsgs = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model: config.model,
    messages: userAssistantMsgs.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.maxTokens ?? 2048,
  };

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  console.log(`[AI] Anthropic request → ${url}, model=${config.model}`);

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "User-Agent": "claude-cli/2.1.117",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  console.log(`[AI] Anthropic response status=${res.status}, length=${rawText.length}`);

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${rawText || "Empty response"}`);
  }

  if (!rawText.trim()) {
    throw new Error("Anthropic API returned empty response body");
  }

  let data: {
    content?: [{ type?: string; text?: string }];
    error?: { message?: string };
  };
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Anthropic API returned invalid JSON: ${rawText.slice(0, 200)}`);
  }

  if (data.error) {
    throw new Error(data.error.message || "Anthropic API error");
  }

  const text = data.content?.[0]?.text;
  if (!text) {
    console.error("[AI] Anthropic empty content, raw:", rawText.slice(0, 1000));
    throw new Error("Anthropic returned empty content");
  }
  return text;
}

export async function callAI(
  messages: AIMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  config?: AIConfig,
  retries = 2
): Promise<string> {
  const resolved = resolveConfig(config);
  if (!resolved) {
    throw new Error(
      "AI API 未配置。请在设置页配置，或在 .env 中设置 AI_API_ENDPOINT、AI_API_KEY、AI_MODEL"
    );
  }

  const fn = isAnthropic(resolved.endpoint) ? callAnthropic : callOpenAICompatible;

  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(resolved, messages, options);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

// ---------- 流式输出支持 ----------

async function* readSSEChunks(response: Response): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data:")) {
        const data = line.slice(5).trimStart();
        if (data === "[DONE]") continue;
        yield data;
      }
    }
  }

  if (buffer.startsWith("data:")) {
    const data = buffer.slice(5).trimStart();
    if (data !== "[DONE]") yield data;
  }
}

async function callOpenAICompatibleStream(
  config: AIConfig,
  messages: AIMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<ReadableStream<string>> {
  const url = config.endpoint.endsWith("/chat/completions")
    ? config.endpoint
    : `${config.endpoint.replace(/\/$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  };

  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "User-Agent": "claude-cli/2.1.117",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error ${res.status}: ${text || "Empty response"}`);
  }

  return new ReadableStream({
    async start(controller) {
      try {
        let totalContent = "";
        for await (const data of readSSEChunks(res)) {
          const parsed = JSON.parse(data) as {
            choices?: [{ delta?: { content?: string; reasoning_content?: string } }];
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(content);
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function callAnthropicStream(
  config: AIConfig,
  messages: AIMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<ReadableStream<string>> {
  const url = config.endpoint.endsWith("/messages")
    ? config.endpoint
    : `${config.endpoint.replace(/\/$/, "")}/messages`;

  const systemMsg = messages.find((m) => m.role === "system");
  const userAssistantMsgs = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model: config.model,
    messages: userAssistantMsgs.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  };

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "User-Agent": "claude-cli/2.1.117",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text || "Empty response"}`);
  }

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const data of readSSEChunks(res)) {
          const parsed = JSON.parse(data) as {
            type?: string;
            delta?: { text?: string };
          };
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            controller.enqueue(parsed.delta.text);
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export async function callAIStream(
  messages: AIMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  config?: AIConfig
): Promise<ReadableStream<string>> {
  const resolved = resolveConfig(config);
  if (!resolved) {
    throw new Error(
      "AI API 未配置。请在设置页配置，或在 .env 中设置 AI_API_ENDPOINT、AI_API_KEY、AI_MODEL"
    );
  }

  const fn = isAnthropic(resolved.endpoint)
    ? callAnthropicStream
    : callOpenAICompatibleStream;

  return fn(resolved, messages, options);
}

export function isAIConfigured(config?: AIConfig): boolean {
  return !!resolveConfig(config);
}
