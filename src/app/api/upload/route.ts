import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ASSETS_DIR } from "@/lib/docs";

const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.writeFile(path.join(ASSETS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/api/assets/${name}` });
}
