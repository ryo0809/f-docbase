import { Hono } from "hono";
import { readJson, str, strArray } from "../helpers";
import type { AppEnv } from "../types";

export const orderRoutes = new Hono<AppEnv>().put("/order", async (c) => {
  const b = await readJson(c);
  await c.var.container.order.reorder.execute(c.var.user, {
    parent: str(b.parent),
    folders: Array.isArray(b.folders) ? strArray(b.folders) : undefined,
    docs: Array.isArray(b.docs) ? strArray(b.docs) : undefined,
  });
  return c.json({ ok: true });
});
