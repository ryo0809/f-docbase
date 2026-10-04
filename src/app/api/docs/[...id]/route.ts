import { NextResponse } from "next/server";
import { deleteDoc, readDoc, writeDoc } from "@/lib/docs";

type Ctx = { params: Promise<{ id: string[] }> };

async function docId(ctx: Ctx) {
  return (await ctx.params).id.map(decodeURIComponent).join("/");
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const doc = await readDoc(await docId(ctx));
    return doc ? NextResponse.json(doc) : NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const { title, tags, content } = await req.json();
  try {
    await writeDoc(await docId(ctx), { title, tags: tags ?? [], content: content ?? "" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await deleteDoc(await docId(ctx));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
