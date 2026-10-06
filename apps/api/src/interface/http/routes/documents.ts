import { Hono } from "hono";
import { idAfter, readJson, str, strArray, strOrUndefined } from "../helpers";
import type { AppEnv } from "../types";

const PREFIX = "/api/docs/";

export const documentRoutes = new Hono<AppEnv>()
  .get("/docs", async (c) => c.json(await c.var.container.documents.list.execute(c.var.user)))
  .post("/docs", async (c) => {
    const b = await readJson(c);
    const created = await c.var.container.documents.create.execute(c.var.user, {
      id: str(b.id),
      title: str(b.title),
      tags: strArray(b.tags),
      content: str(b.content),
    });
    return c.json(created, 201);
  })
  .get("/docs/*", async (c) => c.json(await c.var.container.documents.get.execute(c.var.user, idAfter(c, PREFIX))))
  .put("/docs/*", async (c) => {
    const b = await readJson(c);
    await c.var.container.documents.update.execute(c.var.user, idAfter(c, PREFIX), {
      title: str(b.title),
      tags: strArray(b.tags),
      content: str(b.content),
    });
    return c.json({ ok: true });
  })
  .patch("/docs/*", async (c) => {
    const b = await readJson(c);
    await c.var.container.documents.move.execute(c.var.user, idAfter(c, PREFIX), {
      to: strOrUndefined(b.to),
      title: strOrUndefined(b.title),
    });
    return c.json({ ok: true });
  })
  .delete("/docs/*", async (c) => {
    await c.var.container.documents.delete.execute(c.var.user, idAfter(c, PREFIX));
    return c.json({ ok: true });
  });
