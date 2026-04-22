export interface DoubanRSSItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  rating: string;
  comment: string;
  coverUrl: string;
}

export interface ParsedDoubanItem {
  title: string;
  originalTitle: string;
  type: "BOOK" | "MOVIE" | "TV" | "GAME";
  externalUrl: string;
  externalId: string;
  finishedAt: Date | null;
  rating: number | null;
  review: string | null;
  coverUrl: string | null;
  status: string;
}

export interface ScrapeProgress {
  category: string;
  page: number;
  itemsSoFar: number;
  totalCategories: number;
  currentCategoryIndex: number;
  totalItems?: number;
  totalPages?: number;
}

const CATEGORY_MAP = [
  { pattern: /^读过/, type: "BOOK" as const, status: "读过" },
  { pattern: /^(?:在读|最近在读)/, type: "BOOK" as const, status: "在读" },
  { pattern: /^想读/, type: "BOOK" as const, status: "想读" },
  { pattern: /^看过/, type: "MOVIE" as const, status: "看过" },
  { pattern: /^(?:在看|最近在看)/, type: "MOVIE" as const, status: "在看" },
  { pattern: /^想看/, type: "MOVIE" as const, status: "想看" },
  { pattern: /^玩过/, type: "GAME" as const, status: "玩过" },
  { pattern: /^(?:在玩|最近在玩)/, type: "GAME" as const, status: "在玩" },
  { pattern: /^想玩/, type: "GAME" as const, status: "想玩" },
];

const RATING_MAP: Record<string, number> = {
  力荐: 5,
  推荐: 4,
  还行: 3,
  较差: 2,
  很差: 1,
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ==================== RSS 模式 ====================

export async function fetchDoubanRSS(userId: string): Promise<string> {
  const url = `https://www.douban.com/feed/people/${userId}/interests`;

  const fetchOptions: RequestInit = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  };

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    throw new Error(`豆瓣 RSS 请求失败: ${res.status}`);
  }
  return res.text();
}

export function parseRSSItems(xml: string): DoubanRSSItem[] {
  const items: DoubanRSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(
        new RegExp(
          `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`
        )
      );
      return m ? m[1].trim() : "";
    };

    const title = get("title");
    const link = get("link");
    const guid = get("guid");
    const pubDate = get("pubDate");
    const desc = get("description");

    const ratingMatch = desc.match(/推荐:\s*(力荐|推荐|还行|较差|很差)/);
    const rating = ratingMatch ? ratingMatch[1] : "";

    const commentMatch = desc.match(/(?:短评|备注):\s*([^<]+)/);
    const comment = commentMatch ? commentMatch[1].trim() : "";

    const coverMatch = desc.match(/<img[^>]+src="([^"]+)"/);
    const coverUrl = coverMatch ? coverMatch[1] : "";

    items.push({ title, link, guid, pubDate, rating, comment, coverUrl });
  }

  return items;
}

export function extractName(title: string): {
  name: string;
  category: (typeof CATEGORY_MAP)[0] | null;
} {
  for (const cat of CATEGORY_MAP) {
    if (cat.pattern.test(title)) {
      return {
        name: title.replace(cat.pattern, "").trim(),
        category: cat,
      };
    }
  }
  return { name: title, category: null };
}

export function parseDoubanItems(
  rssItems: DoubanRSSItem[]
): ParsedDoubanItem[] {
  const result: ParsedDoubanItem[] = [];

  for (const item of rssItems) {
    const { name, category } = extractName(item.title);
    if (!category) continue;

    // 只导入已完成的
    if (!["读过", "看过", "玩过"].includes(category.status)) continue;

    if (item.title.match(/^听/)) continue;

    const idMatch =
      item.link.match(/\/subject\/(\d+)\//) ||
      item.link.match(/\/game\/(\d+)\//);
    const externalId = idMatch ? idMatch[1] : "";

    let finishedAt: Date | null = null;
    try {
      const direct = item.pubDate.match(/(\d{4}-\d{2}-\d{2})/);
      if (direct) {
        finishedAt = new Date(direct[1]);
      } else {
        const d = new Date(item.pubDate);
        const cst = new Date(d.getTime() + 8 * 3600000);
        finishedAt = new Date(cst.toISOString().split("T")[0]);
      }
    } catch {
      finishedAt = null;
    }

    const rawType = category.type;
    const finalType = rawType === "MOVIE" ? guessMovieOrTV(name) : rawType;

    result.push({
      title: name,
      originalTitle: "",
      type: finalType,
      externalUrl: item.link,
      externalId,
      finishedAt,
      rating: item.rating ? (RATING_MAP[item.rating] ?? null) : null,
      review: item.comment || null,
      coverUrl: item.coverUrl || null,
      status: category.status,
    });
  }

  return result;
}

// ==================== 全量抓取 ====================

interface ScrapeCategory {
  base: string;
  type: "book" | "movie" | "music" | "game";
  path: string;
  status: string;
  itemType: "BOOK" | "MOVIE" | "GAME";
}

// 只抓取已完成的（collect）
const SCRAPE_CATEGORIES: ScrapeCategory[] = [
  { base: "https://book.douban.com", type: "book", path: "collect", status: "读过", itemType: "BOOK" },
  { base: "https://movie.douban.com", type: "movie", path: "collect", status: "看过", itemType: "MOVIE" },
  { base: "https://www.douban.com", type: "game", path: "games?action=collect", status: "玩过", itemType: "GAME" },
];

async function fetchPage(url: string, referer?: string): Promise<string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html",
  };
  if (referer) {
    headers.Referer = referer;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractGridItems(html: string): string[] {
  const blocks = html.split(/<div class="item comment-item"[^>]*>/);
  const items: string[] = [];

  for (let i = 1; i < blocks.length; i++) {
    const content = blocks[i];
    let depth = 1;
    let pos = 0;

    while (pos < content.length && depth > 0) {
      const openIdx = content.indexOf("<div", pos);
      const closeIdx = content.indexOf("</div>", pos);

      if (closeIdx === -1) break;
      if (openIdx !== -1 && openIdx < closeIdx) {
        depth++;
        pos = openIdx + 4;
      } else {
        depth--;
        pos = closeIdx + 6;
      }
    }

    items.push(content.substring(0, pos));
  }

  return items;
}

function parseGridPage(
  html: string
): (Omit<ParsedDoubanItem, "type" | "status"> & { intro?: string })[] {
  const items: (Omit<ParsedDoubanItem, "type" | "status"> & {
    intro?: string;
  })[] = [];
  const blocks = extractGridItems(html);

  for (const block of blocks) {
    // 封面图
    const coverMatch = block.match(
      /<div class="pic">[\s\S]*?<img[^>]+src="([^"]+)"/
    );
    const coverUrl = coverMatch ? coverMatch[1] : null;

    // 标题和链接
    const titleMatch = block.match(
      /<li class="title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/
    );
    if (!titleMatch) continue;
    const link = titleMatch[1];
    const titleHtml = titleMatch[2];

    // 提取 <em> 中的主标题
    const emMatch = titleHtml.match(/<em>([\s\S]*?)<\/em>/);
    const title = emMatch
      ? emMatch[1].trim()
      : titleHtml.replace(/<[^>]+>/g, "").trim();

    // 日期和评分
    const dateMatch = block.match(/<span class="date">([\s\S]*?)<\/span>/);
    let date = "";
    let rating = 0;
    if (dateMatch) {
      const dm = dateMatch[1].match(/(\d{4}-\d{2}-\d{2})/);
      if (dm) date = dm[1];
      const rm = block.match(/rating(\d+)-t/);
      if (rm) rating = parseInt(rm[1]);
    }

    // 评论
    const commentMatch = block.match(
      /<span class="comment">([\s\S]*?)<\/span>/
    );
    const comment = commentMatch
      ? commentMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    // intro
    const introMatch = block.match(/<li class="intro">([\s\S]*?)<\/li>/);
    const intro = introMatch
      ? introMatch[1].replace(/<[^>]+>/g, "").trim()
      : undefined;

    // ID
    const idMatch = link.match(/\/subject\/(\d+)\//);
    const externalId = idMatch ? idMatch[1] : "";

    items.push({
      title,
      originalTitle: "",
      externalUrl: link,
      externalId,
      finishedAt: date ? new Date(date) : null,
      rating: rating || null,
      review: comment || null,
      coverUrl,
      intro,
    });
  }

  return items;
}

function parseBookPage(
  html: string
): (Omit<ParsedDoubanItem, "type" | "status"> & { intro?: string })[] {
  const items: (Omit<ParsedDoubanItem, "type" | "status"> & {
    intro?: string;
  })[] = [];
  const blocks = html.split(/<li class="subject-item">/);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // 封面图
    const coverMatch = block.match(
      /<div class="pic">[\s\S]*?<img[^>]+src="([^"]+)"/
    );
    const coverUrl = coverMatch ? coverMatch[1] : null;

    // 标题和链接
    const titleMatch = block.match(
      /<h2[^>]*>[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/
    );
    if (!titleMatch) continue;
    const link = titleMatch[1];
    const titleHtml = titleMatch[2];
    const title = titleHtml.replace(/<[^>]+>/g, "").trim();

    // 日期和评分
    const dateMatch = block.match(/<span class="date">([\s\S]*?)<\/span>/);
    let date = "";
    let rating = 0;
    if (dateMatch) {
      const dm = dateMatch[1].match(/(\d{4}-\d{2}-\d{2})/);
      if (dm) date = dm[1];
      const rm = block.match(/rating(\d+)-t/);
      if (rm) rating = parseInt(rm[1]);
    }

    // 评论
    const commentMatch = block.match(
      /<p class="comment comment-item"[^>]*>([\s\S]*?)<\/p>/
    );
    const comment = commentMatch
      ? commentMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    // ID
    const idMatch = link.match(/\/subject\/(\d+)\//);
    const externalId = idMatch ? idMatch[1] : "";

    items.push({
      title,
      originalTitle: "",
      externalUrl: link,
      externalId,
      finishedAt: date ? new Date(date) : null,
      rating: rating || null,
      review: comment || null,
      coverUrl,
      intro: undefined,
    });
  }

  return items;
}

function parseGamePage(
  html: string
): (Omit<ParsedDoubanItem, "type" | "status"> & { intro?: string })[] {
  const items: (Omit<ParsedDoubanItem, "type" | "status"> & {
    intro?: string;
  })[] = [];
  const blocks = html.split(/<div class="common-item">/);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const titleMatch = block.match(
      /<div class="title">\s*<a href="(https:\/\/www\.douban\.com\/game\/\d+\/)">([\s\S]*?)<\/a>/
    );
    if (!titleMatch) continue;
    const link = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();

    let rating = 0;
    const ratingMatch = block.match(/allstar(\d+)/);
    if (ratingMatch) rating = parseInt(ratingMatch[1]) / 10;

    let date = "";
    const dateMatch = block.match(/<span class="date">([\s\S]*?)<\/span>/);
    if (dateMatch) {
      const dm = dateMatch[1].match(/(\d{4}-\d{2}-\d{2})/);
      if (dm) date = dm[1];
    }

    const idMatch = link.match(/\/game\/(\d+)\//);
    const externalId = idMatch ? idMatch[1] : "";

    // 封面图（优先 .pic 下的 img，否则取第一个 img）
    const coverMatch =
      block.match(/<div class="pic">[\s\S]*?<img[^>]+src="([^"]+)"/) ||
      block.match(/<img[^>]+src="([^"]+)"/);
    const coverUrl = coverMatch ? coverMatch[1] : null;

    items.push({
      title,
      originalTitle: "",
      externalUrl: link,
      externalId,
      finishedAt: date ? new Date(date) : null,
      rating: rating || null,
      review: null,
      coverUrl,
      intro: undefined,
    });
  }

  return items;
}

function guessMovieOrTV(title: string, intro?: string): "MOVIE" | "TV" {
  if (
    /第[一二三四五六七八九十\d]+季|Season\s*\d|特别篇|完结篇|番外/.test(
      title
    )
  ) {
    return "TV";
  }

  // 从 intro 中判断：剧集的剧名在 intro 中会重复出现
  if (intro) {
    const baseName = title
      .replace(/\s*第[一二三四五六七八九十\d]+季.*$/, "")
      .replace(/\s*Season\s*\d.*$/i, "")
      .trim();

    if (baseName && baseName.length > 1) {
      const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = intro.match(new RegExp(escaped, "g"));
      if (matches && matches.length >= 2) {
        return "TV";
      }
    }
  }

  return "MOVIE";
}

// 移动端 API 缓存
const detailCache = new Map<
  string,
  { isTV: boolean; coverUrl: string | null }
>();

async function fetchDoubanDetail(
  subjectId: string
): Promise<{ isTV: boolean; coverUrl: string | null }> {
  if (detailCache.has(subjectId)) return detailCache.get(subjectId)!;

  const res = await fetch(
    `https://m.douban.com/rexxar/api/v2/movie/${subjectId}`,
    {
      headers: {
        Referer: "https://m.douban.com/movie/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }
  );

  if (!res.ok) {
    detailCache.set(subjectId, { isTV: false, coverUrl: null });
    return { isTV: false, coverUrl: null };
  }

  const data = await res.json();
  const result = {
    isTV: data.is_tv === true,
    coverUrl: data.pic?.normal || null,
  };

  detailCache.set(subjectId, result);
  await sleep(300);
  return result;
}

export async function supplementMovieDetails(items: ParsedDoubanItem[]): Promise<void> {
  // 找出需要补充类型的条目（没有明显季数标记的 MOVIE）
  const needDetail = items.filter((item) => {
    if (item.type !== "MOVIE") return false;
    // 标题中有明显季数标记的，已经是 TV 了，不需要 API
    if (/第[一二三四五六七八九十\d]+季|Season\s*\d/.test(item.title))
      return false;
    return !!item.externalId;
  });

  const batchSize = 3;
  for (let i = 0; i < needDetail.length; i += batchSize) {
    const batch = needDetail.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        const detail = await fetchDoubanDetail(item.externalId);
        item.type = detail.isTV ? "TV" : "MOVIE";
        // 如果 grid 模式没拿到封面，用 API 的补上
        if (!item.coverUrl && detail.coverUrl) {
          item.coverUrl = detail.coverUrl;
        }
      })
    );
  }
}

async function fetchCategory(
  category: ScrapeCategory,
  userId: string,
  onProgress?: (progress: ScrapeProgress) => void | Promise<void>,
  currentCategoryIndex = 0
): Promise<ParsedDoubanItem[]> {
  const allItems: ParsedDoubanItem[] = [];
  let start = 0;
  let retries = 0;
  const MAX_RETRIES = 3;
  const isGame = category.type === "game";
  const pageSize = 15;
  const totalCategories = SCRAPE_CATEGORIES.length;
  let totalItems: number | undefined;

  while (true) {
    const hasQuery = category.path.includes("?");
    const sep = hasQuery ? "&" : "?";
    const url = `${category.base}/people/${userId}/${category.path}${sep}start=${start}&sort=time&rating=all&filter=all&mode=grid`;

    try {
      const html = await fetchPage(url, category.base + "/");

      if (totalItems === undefined) {
        const totalMatch = html.match(
          /<span class="subject-num">[\s\S]*?\/\s*(\d+)/
        );
        if (totalMatch) {
          totalItems = parseInt(totalMatch[1], 10);
        }
      }

      let items;
      if (isGame) {
        items = parseGamePage(html);
      } else if (category.type === "book") {
        items = parseBookPage(html);
      } else {
        items = parseGridPage(html);
      }

      if (items.length === 0) break;

      for (const item of items) {
        const baseType = category.itemType;
        const finalType =
          baseType === "MOVIE" ? guessMovieOrTV(item.title, item.intro) : baseType;

        allItems.push({
          ...item,
          type: finalType,
          status: category.status,
        });
      }

      retries = 0;

      const currentPage = start / pageSize + 1;
      const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : undefined;

      await onProgress?.({
        category: category.status,
        page: currentPage,
        itemsSoFar: allItems.length,
        totalCategories,
        currentCategoryIndex,
        totalItems,
        totalPages,
      });

      if (items.length < pageSize) break;
      start += pageSize;
      await sleep(2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        (msg.includes("403") || msg.includes("418")) &&
        retries < MAX_RETRIES
      ) {
        retries++;
        const delay = 10000 * Math.pow(2, retries - 1);
        console.log(
          `Rate limited, retry ${retries}/${MAX_RETRIES}, waiting ${delay / 1000}s...`
        );
        await sleep(delay);
        continue;
      }
      console.error(`Giving up on ${category.status} after ${retries} retries`);
      break;
    }
  }

  return allItems;
}

export async function scrapeDoubanCollections(
  userId: string,
  onProgress?: (progress: ScrapeProgress) => void | Promise<void>
): Promise<ParsedDoubanItem[]> {
  const allItems: ParsedDoubanItem[] = [];

  for (let i = 0; i < SCRAPE_CATEGORIES.length; i++) {
    const cat = SCRAPE_CATEGORIES[i];
    console.log(`Fetching ${cat.status} (${cat.type})...`);
    const items = await fetchCategory(cat, userId, onProgress, i);
    console.log(`  Got ${items.length} items`);
    allItems.push(...items);
    await sleep(3000);
  }

  // 补充封面和准确类型
  console.log("Supplementing movie/TV details...");
  await supplementMovieDetails(allItems);
  console.log("Done.");

  return allItems;
}
