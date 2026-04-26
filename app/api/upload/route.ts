import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function getMagicBytes(buffer: Uint8Array): string {
  return Array.from(buffer.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

function isValidImage(buffer: Uint8Array): boolean {
  const magic = getMagicBytes(buffer);
  // JPEG: FF D8 FF
  if (magic.startsWith("ff d8 ff")) return true;
  // PNG: 89 50 4E 47
  if (magic.startsWith("89 50 4e 47")) return true;
  // GIF: 47 49 46 38
  if (magic.startsWith("47 49 46 38")) return true;
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (magic.startsWith("52 49 46 46")) {
    const webpSignature = Array.from(buffer.slice(8, 12))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    if (webpSignature === "57 45 42 50") return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "只允许上传图片文件（JPEG、PNG、GIF、WebP）" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "文件大小超过 5MB 限制" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    if (!isValidImage(buffer)) {
      return NextResponse.json(
        { error: "文件内容不是有效的图片格式" },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? ext : ".jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch {
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
