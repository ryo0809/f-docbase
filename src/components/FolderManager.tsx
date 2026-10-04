"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./ConfirmDialog";
import { MoveDocDialog } from "./MoveDocDialog";

type Folder = { path: string; docCount: number };
type Doc = { id: string; title: string };

const input =
  "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none";
const action =
  "rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-brand-400 hover:text-brand-700";

type Row =
  | { kind: "folder"; depth: number; folder: Folder }
  | { kind: "doc"; depth: number; doc: Doc };

/** フォルダとドキュメントを 1 本のツリー(深さ優先)として並べる。 */
function buildRows(folders: Folder[], docs: Doc[]): Row[] {
  const rows: Row[] = [];
  const parentOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
  const walk = (parent: string, depth: number) => {
    for (const f of folders.filter((f) => parentOf(f.path) === parent)) {
      rows.push({ kind: "folder", depth, folder: f });
      walk(f.path, depth + 1);
    }
    for (const d of docs.filter((d) => parentOf(d.id) === parent)) rows.push({ kind: "doc", depth, doc: d });
  };
  walk("", 0);
  return rows;
}

export function FolderManager({ folders, docs }: { folders: Folder[]; docs: Doc[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [newPath, setNewPath] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [moving, setMoving] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);

  const rows = useMemo(() => buildRows(folders, docs), [folders, docs]);

  async function call(method: string, body: unknown) {
    setError("");
    const res = await fetch("/api/folders", { method, body: JSON.stringify(body) });
    if (!res.ok) {
      setError((await res.json()).error ?? "failed");
      return false;
    }
    router.refresh();
    return true;
  }

  async function create() {
    if (await call("POST", { path: newPath })) setNewPath("");
  }

  async function rename(from: string) {
    if (await call("PATCH", { from, to: draft })) setEditing(null);
  }

  async function remove(f: Folder) {
    await call("DELETE", { path: f.path });
    setDeleting(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <input
          className={`${input} min-w-64 flex-1`}
          placeholder="新しいフォルダのパス (例: requirements/login)"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && newPath && create()}
        />
        <button
          onClick={create}
          disabled={!newPath.trim()}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          フォルダを作成
        </button>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          フォルダもドキュメントもありません。
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
          {rows.map((r) => {
            const pad = { paddingLeft: 16 + r.depth * 24 };
            if (r.kind === "doc") {
              return (
                <li key={`d:${r.doc.id}`} className="flex flex-wrap items-center gap-3 py-2.5 pr-4" style={pad}>
                  <Link
                    href={`/docs/${r.doc.id.split("/").map(encodeURIComponent).join("/")}`}
                    className="min-w-0 flex-1 truncate text-sm text-gray-700 hover:text-brand-700"
                  >
                    📄 {r.doc.title}
                  </Link>
                  <button onClick={() => setMoving(r.doc)} className={action}>
                    移動
                  </button>
                </li>
              );
            }
            const f = r.folder;
            const name = f.path.slice(f.path.lastIndexOf("/") + 1);
            return (
              <li key={`f:${f.path}`} className="flex flex-wrap items-center gap-3 bg-gray-50/60 py-2.5 pr-4" style={pad}>
                {editing === f.path ? (
                  <>
                    <input
                      autoFocus
                      className={`${input} min-w-64 flex-1`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename(f.path);
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                    <button
                      onClick={() => rename(f.path)}
                      className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                    >
                      変更
                    </button>
                    <button onClick={() => setEditing(null)} className={action}>
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm" title={f.path}>
                      📁 <span className="font-medium">{name}</span>
                    </span>
                    <span className="text-xs text-gray-400">{f.docCount} 件</span>
                    <button
                      onClick={() => {
                        setEditing(f.path);
                        setDraft(f.path);
                        setError("");
                      }}
                      className={action}
                    >
                      移動
                    </button>
                    <button
                      onClick={() => setDeleting(f)}
                      disabled={f.docCount > 0}
                      title={f.docCount > 0 ? "ドキュメントがあるフォルダは削除できません" : ""}
                      className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-600"
                    >
                      削除
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {deleting && (
        <ConfirmDialog
          title="フォルダを削除しますか?"
          target={deleting.path}
          message="空のフォルダのみ削除できます。この操作は取り消せません。"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}

      {moving && (
        <MoveDocDialog
          doc={moving}
          folders={folders.map((f) => f.path)}
          onClose={() => setMoving(null)}
          onDone={() => {
            setMoving(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
