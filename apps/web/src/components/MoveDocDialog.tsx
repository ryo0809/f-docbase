import { useState } from "react";
import { api, errorMessage } from "../api/client";

const input =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none";

type Props = {
  doc: { id: string; title: string };
  folders: string[];
  onClose: () => void;
  /** 保存後に呼ばれる。新しい id を渡す。 */
  onDone: (newId: string) => void | Promise<void>;
};

/** ドキュメントの名称変更・移動ダイアログ(タイトル / 移動先フォルダ / ファイル名)。 */
export function MoveDocDialog({ doc, folders, onClose, onDone }: Props) {
  const i = doc.id.lastIndexOf("/");
  const [title, setTitle] = useState(doc.title);
  const [folder, setFolder] = useState(i < 0 ? "" : doc.id.slice(0, i));
  const [name, setName] = useState(i < 0 ? doc.id : doc.id.slice(i + 1));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const to = folder ? `${folder}/${name}` : name;
  const changed = title !== doc.title || to !== doc.id;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.patchDoc(doc.id, { to, title });
    } catch (e) {
      setBusy(false);
      setError(errorMessage(e, "failed"));
      return;
    }
    setBusy(false);
    await onDone(to);
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <h2 className="text-lg font-bold">移動</h2>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500">タイトル</span>
          <input autoFocus className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500">移動先フォルダ</span>
          <select className={input} value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">📁 ルート</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                📁 {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500">ファイル名(.md なし)</span>
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[/\\]|\.md$/g, ""))}
          />
        </label>
        <p className="text-xs text-gray-400">保存先: {to || "-"}.md</p>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={busy || !changed || !title.trim() || !name}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
