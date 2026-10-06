import { Hono } from "hono";
import type { AppEnv } from "../types";

export const templateRoutes = new Hono<AppEnv>().get("/templates", (c) =>
  c.json(c.var.container.templates.list.execute(c.var.user)),
);
