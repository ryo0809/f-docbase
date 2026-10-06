import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import { can, type Permission } from "./roles";
import { findUser, type PublicUser } from "./users";

/** 現在ログイン中のユーザー。ロールは毎回ユーザー保存先から読むため、変更・削除がすぐ反映される。 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const username = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return username ? findUser(username) : null;
}

/** レスポンスにセッション Cookie を付けてログイン状態にする。 */
export async function startSession<T extends NextResponse>(res: T, username: string): Promise<T> {
  res.cookies.set(SESSION_COOKIE, await signSession(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

/** API 用の認可。許可されなければ 401(未ログイン)/ 403(権限なし)のレスポンスを返す。 */
export async function authorize(permission: Permission): Promise<PublicUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  if (!can(user.role, permission)) return NextResponse.json({ error: "この操作を行う権限がありません" }, { status: 403 });
  return user;
}
