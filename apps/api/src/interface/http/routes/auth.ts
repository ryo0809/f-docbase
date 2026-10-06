import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "../../../application/auth/session-policy";
import { readJson, str } from "../helpers";
import type { AppEnv } from "../types";

const cookieOptions = (c: Context<AppEnv>) => ({
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: new URL(c.req.url).protocol === "https:",
  path: "/",
});

export const authRoutes = new Hono<AppEnv>()
  // 画面の起動時に呼ぶ。初期設定が必要か、ログイン中か、を返す(未ログインでも使える)
  .get("/auth/status", async (c) => c.json(await c.var.container.auth.status.execute(c.var.user)))
  .post("/auth/login", async (c) => {
    const body = await readJson(c);
    const { user, token } = await c.var.container.auth.login.execute({
      username: str(body.username),
      password: str(body.password),
    });
    setCookie(c, SESSION_COOKIE, token, { ...cookieOptions(c), maxAge: SESSION_MAX_AGE_SECONDS });
    return c.json(user);
  })
  // 初期オーナーの作成。ユーザーが1人もいないときだけ使える。作成後はそのままログインする
  .post("/auth/setup", async (c) => {
    const body = await readJson(c);
    const { user, token } = await c.var.container.auth.setupOwner.execute({
      username: str(body.username),
      password: str(body.password),
    });
    setCookie(c, SESSION_COOKIE, token, { ...cookieOptions(c), maxAge: SESSION_MAX_AGE_SECONDS });
    return c.json(user, 201);
  })
  .post("/auth/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, cookieOptions(c));
    return c.json({ ok: true });
  });
