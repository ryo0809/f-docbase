import Link from "next/link";
import { notFound } from "next/navigation";
import { listFolders, readDoc } from "@/lib/docs";
import { MoveDocButton } from "@/components/MoveDocButton";
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
    <article className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="mb-1 text-xs text-gray-400">📁 {id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : "ルート"}</div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <div className="flex shrink-0 gap-2 text-sm">
            <Link
              href={`/edit/${enc}`}
              className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              編集
            </Link>
            <MoveDocButton doc={{ id, title: doc.title }} folders={(await listFolders()).map((f) => f.path)} />
            <DeleteButton id={id} title={doc.title} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {doc.tags.map((t) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700 hover:bg-brand-100"
            >
              {t}
            </Link>
          ))}
          <span className="ml-auto">更新: {new Date(doc.updated).toLocaleString("ja-JP")}</span>
        </div>
      </div>
      <Markdown content={doc.content} toc />
    </article>
  );
}
