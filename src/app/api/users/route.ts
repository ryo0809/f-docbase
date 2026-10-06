import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { createUser, listUsers } from "@/lib/users";

export async function GET() {
  const auth = await authorize("manageUsers");
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listUsers());
}

export async function POST(req: Request) {
  const auth = await authorize("manageUsers");
  if (auth instanceof NextResponse) return auth;
  const { username, password, role } = await req.json().catch(() => ({}));
  if (!isRole(role)) return NextResponse.json({ error: "ロールが正しくありません" }, { status: 400 });
  try {
    return NextResponse.json(await createUser(String(username ?? ""), String(password ?? ""), role), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
