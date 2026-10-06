import { Hono } from "hono";
import { ValidationError } from "../../../domain/shared/errors";
import type { AppEnv } from "../types";

export const assetRoutes = new Hono<AppEnv>()
  .post("/upload", async (c) => {
    const body: Record<string, unknown> = await c.req.parseBody().catch(() => ({}));
    const file = body.file;
    if (!(file instanceof File)) throw new ValidationError("file required");
    const result = await c.var.container.assets.upload.execute(c.var.user, {
      filename: file.name,
      data: new Uint8Array(await file.arrayBuffer()),
    });
    return c.json(result);
  })
  .get("/assets/:name", async (c) => {
    const asset = await c.var.container.assets.get.execute(c.var.user, c.req.param("name"));
    return new Response(asset.data as BodyInit, {
      headers: {
        "Content-Type": asset.contentType,
        // SVG に埋め込まれたスクリプトを実行させない
        "Content-Security-Policy": "script-src 'none'",
        "X-Content-Type-Options": "nosniff",
        // 名前は一意で中身は変わらないので、ブラウザに保存させてよい(共有キャッシュには置かせない)
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  });
