import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IMAGE_HOSTS = ["doubanio.com", "img1.doubanio.com", "img2.doubanio.com", "img3.doubanio.com", "img9.doubanio.com", "qnmob3.doubanio.com"];

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith("." + host));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isAllowedImageUrl(url)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  try {
    const fetchOptions: RequestInit = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.douban.com/",
      },
    };

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Image fetch failed: ${res.status}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Image proxy error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Proxy failed" },
      { status: 500 }
    );
  }
}
