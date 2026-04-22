import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const filePath = path.join(uploadsDir, fileName);

  await writeFile(filePath, buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
