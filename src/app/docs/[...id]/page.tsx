import Link from "next/link";
import { notFound } from "next/navigation";
import { readDoc } from "@/lib/docs";
import { Markdown } from "@/components/Markdown";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string[] }> }) {
  const segs = (await params).id.map(decodeURIComponent);
  const id = segs.join("/");
  const doc = await readDoc(id).catch(() => null);
  if (!doc) notFound();
  const enc = segs.map(encodeURIComponent).join("/");

  return (
    <article>
      <div className="mb-4 flex items-start justify-between border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span>{doc.id}.md</span>
            {doc.tags.map((t) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded bg-gray-100 px-1.5 py-0.5">
                {t}
              </Link>
            ))}
            <span>更新: {new Date(doc.updated).toLocaleString("ja-JP")}</span>
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/edit/${enc}`} className="rounded border border-gray-300 px-3 py-1">
            編集
          </Link>
          <DeleteButton id={id} />
        </div>
      </div>
      <Markdown content={doc.content} toc />
    </article>
  );
}
