import Link from "next/link";
import { listDocs } from "@/lib/docs";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const all = await listDocs();
  const docs = (tag ? all.filter((d) => d.tags.includes(tag)) : all).sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">{tag ? `#${tag}` : "すべてのドキュメント"}</h1>
        <span className="text-sm text-gray-500">{docs.length} 件</span>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <p className="mb-4">ドキュメントがありません。</p>
          <Link href="/new" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            最初のドキュメントを作成
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => {
            const i = d.id.lastIndexOf("/");
            const folder = i < 0 ? "" : d.id.slice(0, i);
            return (
              <li key={d.id}>
                <Link
                  href={`/docs/${d.id.split("/").map(encodeURIComponent).join("/")}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
                >
                  <div className="mb-1 text-xs text-gray-400">📁 {folder || "ルート"}</div>
                  <h2 className="text-base font-semibold text-gray-900">{d.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {d.tags.map((t) => (
                      <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                        {t}
                      </span>
                    ))}
                    <span className="ml-auto">更新: {new Date(d.updated).toLocaleDateString("ja-JP")}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
