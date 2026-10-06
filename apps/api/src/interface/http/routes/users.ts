import { Hono } from "hono";
import { readJson, str } from "../helpers";
import type { AppEnv } from "../types";

export const userRoutes = new Hono<AppEnv>()
  .get("/users", async (c) => c.json(await c.var.container.users.list.execute(c.var.user)))
  .post("/users", async (c) => {
    const b = await readJson(c);
    const created = await c.var.container.users.create.execute(c.var.user, {
      username: str(b.username),
      password: str(b.password),
      role: b.role,
    });
    return c.json(created, 201);
  })
  .patch("/users/:username", async (c) => {
    const b = await readJson(c);
    await c.var.container.users.update.execute(c.var.user, c.req.param("username"), {
      role: b.role,
      password: typeof b.password === "string" ? b.password : undefined,
    });
    return c.json({ ok: true });
  })
  .delete("/users/:username", async (c) => {
    await c.var.container.users.delete.execute(c.var.user, c.req.param("username"));
    return c.json({ ok: true });
  });
