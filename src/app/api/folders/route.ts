import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { createFolder, deleteFolder, listFolders, renameFolder } from "@/lib/docs";

export async function GET() {
  const auth = await authorize("view");
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listFolders());
}

async function run(permission: "edit" | "delete", fn: () => Promise<void>, status = 200) {
  const auth = await authorize(permission);
  if (auth instanceof NextResponse) return auth;
  try {
    await fn();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status });
}

export async function POST(req: Request) {
  const { path } = await req.json();
  return run("edit", () => createFolder(String(path ?? "")), 201);
}

export async function PATCH(req: Request) {
  const { from, to } = await req.json();
  return run("edit", () => renameFolder(String(from ?? ""), String(to ?? "")));
}

export async function DELETE(req: Request) {
  const { path } = await req.json();
  return run("delete", () => deleteFolder(String(path ?? "")));
}
