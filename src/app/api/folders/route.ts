import { NextResponse } from "next/server";
import { createFolder, deleteFolder, listFolders, renameFolder } from "@/lib/docs";

export async function GET() {
  return NextResponse.json(await listFolders());
}

async function run(fn: () => Promise<void>, status = 200) {
  try {
    await fn();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status });
}

export async function POST(req: Request) {
  const { path } = await req.json();
  return run(() => createFolder(String(path ?? "")), 201);
}

export async function PATCH(req: Request) {
  const { from, to } = await req.json();
  return run(() => renameFolder(String(from ?? ""), String(to ?? "")));
}

export async function DELETE(req: Request) {
  const { path } = await req.json();
  return run(() => deleteFolder(String(path ?? "")));
}
