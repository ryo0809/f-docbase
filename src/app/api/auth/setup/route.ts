import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { setupOwner } from "@/lib/users";

/** 初期オーナーの作成。ユーザーが1人もいないときだけ使える。作成後はそのままログインする。 */
export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  try {
    const user = await setupOwner(String(username ?? ""), String(password ?? ""));
    return startSession(NextResponse.json({ username: user.username, role: user.role }, { status: 201 }), user.username);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
