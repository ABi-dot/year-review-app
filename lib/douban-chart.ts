export interface ChartItem {
  title: string;
  creator: string;
  rating: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(url: string, referer?: string): Promise<string> {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "text/html",
  };
  if (referer) headers.Referer = referer;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 豆瓣电影/剧集热门榜（chart 页面）
export async function fetchMovieChart(): Promise<ChartItem[]> {
  const html = await fetchHtml("https://movie.douban.com/chart", "https://movie.douban.com");
  const items: ChartItem[] = [];

  // 解析 <tr class="item">...</tr>
  const rows = html.split(/<tr class="item"[^>]*>/);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // 标题
    const titleMatch = row.match(/<a[^>]+class="title"[^>]*>([^<]+)<\/a>/);
    if (!titleMatch) continue;
    const title = cleanText(titleMatch[1]);

    // 导演/主演
    const creatorMatch = row.match(/<p class="pl">([^<]+)<\/p>/);
    const creatorRaw = creatorMatch ? creatorMatch[1] : "";
    // 取"导演: xxx"或第一段
    const creator = creatorRaw.split(" / ")[0].replace(/^导演:\s*/, "").trim();

    // 评分
    const ratingMatch = row.match(/<span class="rating_nums">([\d.]+)<\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : "";

    if (title) {
      items.push({ title, creator, rating });
    }
  }

  return items.slice(0, 20);
}

// 豆瓣剧集热门
export async function fetchTVChart(): Promise<ChartItem[]> {
  const html = await fetchHtml(
    "https://movie.douban.com/tv/#!type=tv&status=P&sort=recommend",
    "https://movie.douban.com"
  );
  const items: ChartItem[] = [];

  const rows = html.split(/<tr class="item"[^>]*>/);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const titleMatch = row.match(/<a[^>]+class="title"[^>]*>([^<]+)<\/a>/);
    if (!titleMatch) continue;
    const title = cleanText(titleMatch[1]);

    const creatorMatch = row.match(/<p class="pl">([^<]+)<\/p>/);
    const creatorRaw = creatorMatch ? creatorMatch[1] : "";
    const creator = creatorRaw.split(" / ")[0].replace(/^导演:\s*/, "").trim();

    const ratingMatch = row.match(/<span class="rating_nums">([\d.]+)<\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : "";

    if (title) {
      items.push({ title, creator, rating });
    }
  }

  return items.slice(0, 20);
}

// 豆瓣书籍热门（新书榜）
export async function fetchBookChart(): Promise<ChartItem[]> {
  const html = await fetchHtml("https://book.douban.com/chart", "https://book.douban.com");
  const items: ChartItem[] = [];

  // 解析 ul.chart-dashed-list > li
  const lis = html.split(/<li[^>]*class="[^"]*chart-dashed-list[^"]*"[^>]*>/);
  for (let i = 1; i < lis.length; i++) {
    const li = lis[i];

    const titleMatch = li.match(/<a[^>]+title="([^"]+)"/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    const authorMatch = li.match(/<p[^>]*class="[^"]*color-gray[^"]*"[^>]*>([^<]+)<\/p>/);
    const creator = authorMatch ? cleanText(authorMatch[1]).split(" / ")[0].trim() : "";

    const ratingMatch = li.match(/<span class="rating_nums">([\d.]+)<\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : "";

    if (title) {
      items.push({ title, creator, rating });
    }
  }

  return items.slice(0, 20);
}

// 统一抓取所有榜单
export async function fetchAllCharts(): Promise<Record<string, ChartItem[]>> {
  const [movies, tvs, books] = await Promise.allSettled([
    fetchMovieChart(),
    fetchTVChart(),
    fetchBookChart(),
  ]);

  return {
    MOVIE: movies.status === "fulfilled" ? movies.value : [],
    TV: tvs.status === "fulfilled" ? tvs.value : [],
    BOOK: books.status === "fulfilled" ? books.value : [],
  };
}
