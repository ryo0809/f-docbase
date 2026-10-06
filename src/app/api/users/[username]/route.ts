import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { deleteUser, updateUser } from "@/lib/users";

type Ctx = { params: Promise<{ username: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await authorize("manageUsers");
  if (auth instanceof NextResponse) return auth;
  const username = decodeURIComponent((await ctx.params).username);
  const { role, password } = await req.json().catch(() => ({}));
  if (role !== undefined && !isRole(role)) {
    return NextResponse.json({ error: "ロールが正しくありません" }, { status: 400 });
  }
  if (role !== undefined && username === auth.username && role !== auth.role) {
    return NextResponse.json({ error: "自分自身のロールは変更できません" }, { status: 400 });
  }
  try {
    await updateUser(username, { role, password: typeof password === "string" ? password : undefined });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await authorize("manageUsers");
  if (auth instanceof NextResponse) return auth;
  const username = decodeURIComponent((await ctx.params).username);
  if (username === auth.username) {
    return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
  }
  try {
    await deleteUser(username);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
