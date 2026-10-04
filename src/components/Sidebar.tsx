"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Item = { id: string; title: string; tags: string[] };

type Node = { name: string; path: string; folders: Node[]; docs: Item[] };

const href = (id: string) => `/docs/${id.split("/").map(encodeURIComponent).join("/")}`;

function buildTree(docs: Item[], folders: string[]): Node {
  const root: Node = { name: "", path: "", folders: [], docs: [] };
  /** パスに対応するノードを(無ければ作りながら)辿る */
  const ensure = (parts: string[]) => {
    let cur = root;
    for (const name of parts) {
      const path = cur.path ? `${cur.path}/${name}` : name;
      let next = cur.folders.find((f) => f.name === name);
      if (!next) {
        next = { name, path, folders: [], docs: [] };
        cur.folders.push(next);
      }
      cur = next;
    }
    return cur;
  };
  // 空のフォルダも表示できるよう、ドキュメントとは別にフォルダ一覧からも作る
  for (const f of folders) ensure(f.split("/"));
  for (const d of docs) ensure(d.id.split("/").slice(0, -1)).docs.push(d);
  return root;
}

function Tree({ node, activeId, depth = 0 }: { node: Node; activeId: string; depth?: number }) {
  return (
    <ul className="space-y-0.5">
      {node.folders.map((f) => (
        <li key={f.path}>
          <details open={activeId.startsWith(f.path + "/") || depth === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
              <span className="text-[10px] text-gray-400 transition-transform group-open:rotate-90">▶</span>
              <span>📁</span>
              <span className="truncate">{f.name}</span>
            </summary>
            <div className="ml-3 border-l border-gray-200 pl-1">
              <Tree node={f} activeId={activeId} depth={depth + 1} />
            </div>
          </details>
        </li>
      ))}
      {node.docs.map((d) => (
        <li key={d.id}>
          <DocLink item={d} active={d.id === activeId} />
        </li>
      ))}
    </ul>
  );
}

function DocLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={href(item.id)}
      className={`block truncate rounded px-2 py-1 text-sm ${
        active ? "bg-brand-50 font-medium text-brand-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {item.title}
    </Link>
  );
}

function SidebarInner({ docs, folders }: { docs: Item[]; folders: string[] }) {
  const pathname = usePathname();
  const activeTag = useSearchParams().get("tag");
  const [q, setQ] = useState("");

  const activeId = pathname.startsWith("/docs/")
    ? pathname.slice("/docs/".length).split("/").map(decodeURIComponent).join("/")
    : "";
  const tree = useMemo(() => buildTree(docs, folders), [docs, folders]);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of docs) for (const t of d.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [docs]);

  const keyword = q.trim().toLowerCase();
  const hits = keyword
    ? docs.filter((d) => [d.title, d.id, ...d.tags].some((s) => s.toLowerCase().includes(keyword)))
    : [];

  return (
    <div className="space-y-6 p-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="タイトル・タグで絞り込み"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
      />

      {keyword ? (
        <section>
          <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-gray-400">検索結果 ({hits.length})</h2>
          {hits.length === 0 ? (
            <p className="px-2 text-sm text-gray-400">見つかりませんでした</p>
          ) : (
            <ul className="space-y-0.5">
              {hits.map((d) => (
                <li key={d.id}>
                  <DocLink item={d} active={d.id === activeId} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <nav>
            <Link
              href="/"
              className={`mb-2 flex items-center gap-2 rounded px-2 py-1.5 text-sm font-medium ${
                pathname === "/" && !activeTag ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>🏠</span> すべてのドキュメント
              <span className="ml-auto text-xs text-gray-400">{docs.length}</span>
            </Link>
            <div className="mt-4 mb-1 flex items-center justify-between px-2">
              <h2 className="text-xs font-semibold tracking-wide text-gray-400">フォルダ</h2>
              <Link
                href="/folders"
                className={`text-xs ${pathname === "/folders" ? "font-medium text-brand-700" : "text-gray-400 hover:text-brand-700"}`}
              >
                ⚙ 管理
              </Link>
            </div>
            <Tree node={tree} activeId={activeId} />
          </nav>

          {tags.length > 0 && (
            <section>
              <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-gray-400">タグ</h2>
              <ul className="flex flex-wrap gap-1.5 px-2">
                {tags.map(([t, n]) => (
                  <li key={t}>
                    <Link
                      href={`/?tag=${encodeURIComponent(t)}`}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${
                        t === activeTag
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:border-brand-500 hover:text-brand-700"
                      }`}
                    >
                      {t}
                      <span className="opacity-60">{n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function Sidebar({ docs, folders }: { docs: Item[]; folders: string[] }) {
  return (
    <Suspense fallback={null}>
      <SidebarInner docs={docs} folders={folders} />
    </Suspense>
  );
}
