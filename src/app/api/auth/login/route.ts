import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { authenticate } from "@/lib/users";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const user = await authenticate(String(username ?? ""), String(password ?? ""));
  if (!user) {
    return NextResponse.json({ error: "ユーザー名またはパスワードが正しくありません" }, { status: 401 });
  }
  return startSession(NextResponse.json({ username: user.username, role: user.role }), user.username);
}
