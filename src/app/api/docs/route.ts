import { NextResponse } from "next/server";
import { listDocs, writeDoc } from "@/lib/docs";

export async function GET() {
  return NextResponse.json(await listDocs());
}

export async function POST(req: Request) {
  const { id, title, tags, content } = await req.json();
  try {
    await writeDoc(id, { title, tags: tags ?? [], content: content ?? "" }, { create: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ id }, { status: 201 });
}
