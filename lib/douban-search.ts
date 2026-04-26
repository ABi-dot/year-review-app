const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface DoubanSearchResult {
  title: string;
  originalTitle?: string;
  creator?: string;
  year?: string;
  cover?: string;
  url?: string;
  type: "MOVIE" | "TV" | "BOOK";
  externalId?: string;
}

function mapBookResult(raw: unknown): DoubanSearchResult | null {
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title) return null;

  const author = typeof r.author_name === "string" ? r.author_name.trim() : "";

  return {
    title,
    creator: author || undefined,
    year: typeof r.year === "string" ? r.year : undefined,
    cover: typeof r.pic === "string" ? r.pic : undefined,
    url: typeof r.url === "string" ? r.url : undefined,
    type: "BOOK",
    externalId: typeof r.id === "string" ? r.id : undefined,
  };
}

export async function searchDoubanMovies(query: string): Promise<DoubanSearchResult[]> {
  const url = `https://m.douban.com/rexxar/api/v2/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Referer: "https://m.douban.com",
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    subjects?: {
      items?: {
        type_name?: string;
        target?: Record<string, unknown>;
      }[];
    };
  };
  const items = data.subjects?.items ?? [];
  const results: DoubanSearchResult[] = [];
  for (const item of items) {
    const target = item.target;
    if (!target) continue;
    const title = typeof target.title === "string" ? target.title.trim() : "";
    if (!title) continue;

    const typeName = item.type_name;
    if (typeName !== "电影" && typeName !== "电视剧") continue;
    const type = typeName === "电视剧" ? "TV" : "MOVIE";

    const cover = typeof target.cover_url === "string" ? target.cover_url : undefined;

    const id = typeof target.id === "string" ? target.id : undefined;
    const url = id ? `https://movie.douban.com/subject/${id}/` : undefined;

    const subtitle = typeof target.card_subtitle === "string" ? target.card_subtitle : "";
    const parts = subtitle.split(" / ");
    let creator: string | undefined;
    if (parts.length >= 3) {
      creator = parts[2].trim();
    }

    results.push({
      title,
      creator,
      cover,
      url,
      type,
      externalId: id,
    });
  }
  return results;
}

export async function searchDoubanBooks(query: string): Promise<DoubanSearchResult[]> {
  const url = `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://book.douban.com",
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as unknown[];
  return data.map(mapBookResult).filter((r): r is DoubanSearchResult => r !== null);
}

export async function searchDouban(
  query: string,
  type?: "MOVIE" | "TV" | "BOOK"
): Promise<DoubanSearchResult[]> {
  if (type === "BOOK") {
    return searchDoubanBooks(query);
  }
  if (type === "MOVIE" || type === "TV") {
    const results = await searchDoubanMovies(query);
    if (type === "TV") {
      return results.filter((r) => r.type === "TV");
    }
    return results.filter((r) => r.type === "MOVIE");
  }
  // 未指定类型时，同时搜电影和书籍，各取前 5
  const [movies, books] = await Promise.allSettled([
    searchDoubanMovies(query),
    searchDoubanBooks(query),
  ]);
  const movieResults = movies.status === "fulfilled" ? movies.value : [];
  const bookResults = books.status === "fulfilled" ? books.value : [];
  return [...movieResults.slice(0, 5), ...bookResults.slice(0, 5)];
}
