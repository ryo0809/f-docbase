import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE } from "../../application/auth/session-policy";
import type { Container } from "../../container";
import { DomainError, type ErrorKind } from "../../domain/shared/errors";
import { assetRoutes } from "./routes/assets";
import { authRoutes } from "./routes/auth";
import { documentRoutes } from "./routes/documents";
import { folderRoutes } from "./routes/folders";
import { orderRoutes } from "./routes/order";
import { templateRoutes } from "./routes/templates";
import { userRoutes } from "./routes/users";
import type { AppEnv, Env } from "./types";

const STATUS: Record<ErrorKind, 400 | 401 | 403 | 404 | 409> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
};

/** HTTP の入口。resolve は、リクエストごとの環境(D1 など)から use case 一式を返す。 */
export function createApp(resolve: (env: Env) => Container) {
  const app = new Hono<AppEnv>().basePath("/api");

  // ログイン中のユーザーを求める。ロールは毎回保存先から読むため、変更や削除がすぐ反映される
  app.use("*", async (c, next) => {
    const container = resolve(c.env);
    c.set("container", container);
    c.set("user", await container.auth.authenticate.execute(getCookie(c, SESSION_COOKIE)));
    await next();
  });

  app.route("/", authRoutes);
  app.route("/", documentRoutes);
  app.route("/", folderRoutes);
  app.route("/", userRoutes);
  app.route("/", assetRoutes);
  app.route("/", orderRoutes);
  app.route("/", templateRoutes);

  app.onError((err, c) => {
    if (err instanceof DomainError) return c.json({ error: err.message }, STATUS[err.kind]);
    console.error(err);
    return c.json({ error: "サーバーでエラーが発生しました" }, 500);
  });
  app.notFound((c) => c.json({ error: "not found" }, 404));

  return app;
}
