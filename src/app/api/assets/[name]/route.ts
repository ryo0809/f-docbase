import fs from "node:fs/promises";
import path from "node:path";
import { ASSETS_DIR, resolveInside } from "@/lib/docs";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const file = resolveInside(ASSETS_DIR, decodeURIComponent(name));
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type) return new Response("not found", { status: 404 });
    const buf = await fs.readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": type, "Content-Security-Policy": "script-src 'none'" },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
