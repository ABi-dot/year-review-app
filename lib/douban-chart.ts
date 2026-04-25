export interface ChartItem {
  title: string;
  creator: string;
  rating: string;
  cover?: string;
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

// 豆瓣电影热门榜（JSON API）
export async function fetchMovieChart(): Promise<ChartItem[]> {
  const res = await fetch(
    "https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&sort=recommend&page_limit=20&page_start=0",
    {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: "https://movie.douban.com",
      },
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} for movie chart`);
  const data = (await res.json()) as {
    subjects: { title: string; rate: string; cover: string }[];
  };
  return data.subjects.map((s) => ({
    title: s.title,
    creator: "",
    rating: s.rate,
    cover: s.cover,
  }));
}

// 豆瓣剧集热门（JSON API）
export async function fetchTVChart(): Promise<ChartItem[]> {
  const res = await fetch(
    "https://movie.douban.com/j/search_subjects?type=tv&tag=%E7%83%AD%E9%97%A8&sort=recommend&page_limit=20&page_start=0",
    {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: "https://movie.douban.com",
      },
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} for TV chart`);
  const data = (await res.json()) as {
    subjects: { title: string; rate: string; cover: string }[];
  };
  return data.subjects.map((s) => ({
    title: s.title,
    creator: "",
    rating: s.rate,
    cover: s.cover,
  }));
}

// 豆瓣书籍热门（新书榜 HTML）
export async function fetchBookChart(): Promise<ChartItem[]> {
  const html = await fetchHtml("https://book.douban.com/chart", "https://book.douban.com");
  const items: ChartItem[] = [];

  const lis = html.split(/<li class="media clearfix">/);
  for (let i = 1; i < lis.length; i++) {
    const li = lis[i];

    const titleMatch = li.match(/<h2[^>]*>\s*<a[^>]*class="fleft"[^>]*>([^<]+)<\/a>/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    const abstractMatch = li.match(/<p class="subject-abstract color-gray">([\s\S]*?)<\/p>/);
    const abstract = abstractMatch ? abstractMatch[1].trim() : "";
    const creator = abstract.split(" / ")[0].trim();

    const ratingMatch = li.match(/<span class="font-small fleft">([\d.]+)<\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : "";

    const coverMatch = li.match(/<img[^>]*class="subject-cover"[^>]*src="([^"]+)"/);
    const cover = coverMatch ? coverMatch[1] : "";

    if (title) {
      items.push({ title, creator, rating, cover });
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
