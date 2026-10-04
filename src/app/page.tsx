import Link from "next/link";
import { listDocs } from "@/lib/docs";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const all = await listDocs();
  const tags = Array.from(new Set(all.flatMap((d) => d.tags))).sort();
  const docs = tag ? all.filter((d) => d.tags.includes(tag)) : all;

  // フォルダごとにグルーピング
  const groups = new Map<string, typeof docs>();
  for (const d of docs) {
    const i = d.id.lastIndexOf("/");
    const folder = i < 0 ? "" : d.id.slice(0, i);
    groups.set(folder, [...(groups.get(folder) ?? []), d]);
  }

  return (
    <div className="grid grid-cols-[14rem_1fr] gap-8">
      <aside className="text-sm">
        <div className="mb-2 font-semibold text-gray-500">タグ</div>
        <ul className="space-y-1">
          <li>
            <Link href="/" className={!tag ? "font-bold" : "text-gray-600 hover:text-blue-600"}>
              すべて
            </Link>
          </li>
          {tags.map((t) => (
            <li key={t}>
              <Link
                href={`/?tag=${encodeURIComponent(t)}`}
                className={t === tag ? "font-bold" : "text-gray-600 hover:text-blue-600"}
              >
                #{t}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <section>
        {docs.length === 0 && <p className="text-gray-500">ドキュメントがありません。「新規作成」から追加してください。</p>}
        {Array.from(groups.entries()).map(([folder, items]) => (
          <div key={folder} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">📁 {folder || "(ルート)"}</h2>
            <ul className="divide-y divide-gray-100 rounded border border-gray-200">
              {items.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-3 py-2">
                  <Link href={`/docs/${d.id.split("/").map(encodeURIComponent).join("/")}`} className="text-blue-700 hover:underline">
                    {d.title}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    {d.tags.map((t) => (
                      <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                    {new Date(d.updated).toLocaleDateString("ja-JP")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
