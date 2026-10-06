import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api, docHref, errorMessage } from "../api/client";
import { useDocs } from "../auth/DocsProvider";
import { buildTree, type TreeNode } from "../lib/tree";
import { ConfirmDialog } from "./ConfirmDialog";
import { FolderMoveDialog } from "./FolderMoveDialog";
import { MoveDocDialog } from "./MoveDocDialog";

type Folder = { path: string; docCount: number; order: number };
type Doc = { id: string; title: string; order: number };

const input =
  "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none";
const action =
  "rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-brand-400 hover:text-brand-700";
const arrow =
  "rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:text-gray-600";

/** 並べ替えの単位。同じフォルダの直下の、フォルダ同士・ドキュメント同士 */
type Row =
  | { kind: "folder"; depth: number; node: TreeNode<Doc>; parent: string; keys: string[]; index: number }
  | { kind: "doc"; depth: number; doc: Doc; parent: string; keys: string[]; index: number };

/** フォルダとドキュメントを 1 本のツリー(深さ優先)として並べる。 */
function buildRows(root: TreeNode<Doc>): Row[] {
  const rows: Row[] = [];
  const walk = (node: TreeNode<Doc>, depth: number) => {
    const folderKeys = node.folders.map((f) => f.path);
    node.folders.forEach((f, index) => {
      rows.push({ kind: "folder", depth, node: f, parent: node.path, keys: folderKeys, index });
      walk(f, depth + 1);
    });
    const docKeys = node.docs.map((d) => d.id);
    node.docs.forEach((doc, index) => rows.push({ kind: "doc", depth, doc, parent: node.path, keys: docKeys, index }));
  };
  walk(root, 0);
  return rows;
}

const leaf = (key: string) => key.slice(key.lastIndexOf("/") + 1);

type Drag = { kind: "folder" | "doc"; key: string };
type Pending = Drag & { target: string; dest: string };

/** ドラッグしているものを、target(フォルダのパス。ルートは空文字)の直下へ移すときの、新しいパス / id。 */
const destOf = (drag: Drag, target: string) => (target ? `${target}/${leaf(drag.key)}` : leaf(drag.key));

/** ドロップできるか。同じ場所へ移す、自分自身(の配下)へ移す、は不可。 */
function canDrop(drag: Drag | null, target: string): boolean {
  if (!drag) return false;
  if (destOf(drag, target) === drag.key) return false;
  if (drag.kind === "folder" && (target === drag.key || target.startsWith(drag.key + "/"))) return false;
  return true;
}

export function FolderManager({ folders, docs, canDelete }: { folders: Folder[]; docs: Doc[]; canDelete: boolean }) {
  const { reload } = useDocs();
  const [error, setError] = useState("");
  const [newPath, setNewPath] = useState("");
  const [movingDoc, setMovingDoc] = useState<Doc | null>(null);
  const [movingFolder, setMovingFolder] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const tree = useMemo(() => buildTree(docs, folders), [docs, folders]);
  const rows = useMemo(() => buildRows(tree), [tree]);
  const docCounts = useMemo(() => new Map(folders.map((f) => [f.path, f.docCount])), [folders]);

  async function call(run: () => Promise<unknown>) {
    setError("");
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e, "failed"));
      await reload();
      return false;
    }
    await reload();
    return true;
  }

  async function create() {
    if (await call(() => api.createFolder(newPath))) setNewPath("");
  }

  async function remove(f: Folder) {
    await call(() => api.deleteFolder(f.path));
    setDeleting(null);
  }

  /** 同じフォルダの中で、1つ上 / 下へ動かす。 */
  async function shift(row: Row, delta: -1 | 1) {
    const keys = [...row.keys];
    const to = row.index + delta;
    if (to < 0 || to >= keys.length) return;
    [keys[row.index], keys[to]] = [keys[to]!, keys[row.index]!];
    setBusy(true);
    await call(() => api.reorder(row.parent, row.kind === "folder" ? { folders: keys } : { docs: keys }));
    setBusy(false);
  }

  async function confirmDrop(p: Pending) {
    setBusy(true);
    await call(() => (p.kind === "doc" ? api.patchDoc(p.key, { to: p.dest }) : api.renameFolder(p.key, p.dest)));
    setBusy(false);
    setPending(null);
  }

  /** ドロップ先の行・ルートに付ける、ドラッグ操作のハンドラ */
  const dropProps = (target: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!canDrop(drag, target)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (over !== target) setOver(target);
    },
    onDragLeave: () => setOver((cur) => (cur === target ? null : cur)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(null);
      if (drag && canDrop(drag, target)) setPending({ ...drag, target, dest: destOf(drag, target) });
      setDrag(null);
    },
  });

  const dragProps = (d: Drag) => ({
    draggable: !busy,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", d.key);
      e.dataTransfer.effectAllowed = "move";
      setDrag(d);
    },
    onDragEnd: () => {
      setDrag(null);
      setOver(null);
    },
  });

  const dropRing = (target: string) => (over === target && drag ? "bg-brand-50 outline outline-2 -outline-offset-2 outline-brand-400" : "");

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

      <p className="text-xs text-gray-500">
        行をドラッグして、フォルダの上(またはルート)へ落とすと移動できます。「移動」ボタンでも、移動先を選べます。「▲」「▼」で、同じフォルダの中の並び順を変えられます。
      </p>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
        <li
          data-testid="drop-root"
          className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-500 ${dropRing("")}`}
          {...dropProps("")}
        >
          📁 ルート
          {drag && canDrop(drag, "") && <span className="text-xs text-brand-700">ここへ落とすと、ルートへ移動します</span>}
        </li>

        {rows.length === 0 && (
          <li className="p-8 text-center text-gray-500">フォルダもドキュメントもありません。</li>
        )}

        {rows.map((r) => {
          const pad = { paddingLeft: 16 + r.depth * 24 };
          const canUp = r.index > 0;
          const canDown = r.index < r.keys.length - 1;
          const arrows = (
            <>
              <button aria-label="上へ" title="上へ" disabled={!canUp || busy} onClick={() => shift(r, -1)} className={arrow}>
                ▲
              </button>
              <button aria-label="下へ" title="下へ" disabled={!canDown || busy} onClick={() => shift(r, 1)} className={arrow}>
                ▼
              </button>
            </>
          );

          if (r.kind === "doc") {
            return (
              <li
                key={`d:${r.doc.id}`}
                data-row={`doc:${r.doc.id}`}
                className={`flex flex-wrap items-center gap-3 py-2.5 pr-4 ${drag?.key === r.doc.id ? "opacity-40" : ""}`}
                style={pad}
                {...dragProps({ kind: "doc", key: r.doc.id })}
              >
                <Link to={docHref(r.doc.id)} draggable={false} className="min-w-0 flex-1 truncate text-sm text-gray-700 hover:text-brand-700">
                  📄 {r.doc.title}
                </Link>
                {arrows}
                <button onClick={() => setMovingDoc(r.doc)} className={action}>
                  移動
                </button>
              </li>
            );
          }

          const f = r.node;
          const docCount = docCounts.get(f.path) ?? 0;
          const folder: Folder = { path: f.path, docCount, order: f.order };
          return (
            <li
              key={`f:${f.path}`}
              data-row={`folder:${f.path}`}
              className={`flex flex-wrap items-center gap-3 bg-gray-50/60 py-2.5 pr-4 ${drag?.key === f.path ? "opacity-40" : ""} ${dropRing(f.path)}`}
              style={pad}
              {...dragProps({ kind: "folder", key: f.path })}
              {...dropProps(f.path)}
            >
              <span className="min-w-0 flex-1 truncate text-sm" title={f.path}>
                📁 <span className="font-medium">{f.name}</span>
              </span>
              <span className="text-xs text-gray-400">{docCount} 件</span>
              {arrows}
              <button onClick={() => setMovingFolder(folder)} className={action}>
                移動
              </button>
              {canDelete && (
                <button
                  onClick={() => setDeleting(folder)}
                  disabled={docCount > 0}
                  title={docCount > 0 ? "ドキュメントがあるフォルダは削除できません" : ""}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-600"
                >
                  削除
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {deleting && (
        <ConfirmDialog
          title="フォルダを削除しますか?"
          target={deleting.path}
          message="空のフォルダのみ削除できます。この操作は取り消せません。"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}

      {pending && (
        <ConfirmDialog
          title={pending.kind === "folder" ? "フォルダを移動しますか?" : "ドキュメントを移動しますか?"}
          target={`${pending.key}  →  ${pending.target ? `📁 ${pending.target}` : "📁 ルート"}`}
          message={pending.kind === "folder" ? "配下のフォルダとドキュメントも、まとめて移ります。" : "移動先の最後に並びます。"}
          confirmLabel="移動する"
          busy={busy}
          onConfirm={() => confirmDrop(pending)}
          onCancel={() => setPending(null)}
        />
      )}

      {movingDoc && (
        <MoveDocDialog
          doc={movingDoc}
          folders={folders.map((f) => f.path)}
          onClose={() => setMovingDoc(null)}
          onDone={async () => {
            setMovingDoc(null);
            await reload();
          }}
        />
      )}

      {movingFolder && (
        <FolderMoveDialog
          path={movingFolder.path}
          folders={folders.map((f) => f.path)}
          onClose={() => setMovingFolder(null)}
          onDone={async () => {
            setMovingFolder(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

