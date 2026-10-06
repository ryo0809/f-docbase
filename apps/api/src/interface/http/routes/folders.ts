import { Hono } from "hono";
import { readJson, str } from "../helpers";
import type { AppEnv } from "../types";

export const folderRoutes = new Hono<AppEnv>()
  .get("/folders", async (c) => c.json(await c.var.container.folders.list.execute(c.var.user)))
  .post("/folders", async (c) => {
    await c.var.container.folders.create.execute(c.var.user, str((await readJson(c)).path));
    return c.json({ ok: true }, 201);
  })
  .patch("/folders", async (c) => {
    const b = await readJson(c);
    await c.var.container.folders.rename.execute(c.var.user, str(b.from), str(b.to));
    return c.json({ ok: true });
  })
  .delete("/folders", async (c) => {
    await c.var.container.folders.delete.execute(c.var.user, str((await readJson(c)).path));
    return c.json({ ok: true });
  });
