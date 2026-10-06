import { useMemo, useState } from "react";
import { api, errorMessage } from "../api/client";

const input =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none";

type Props = {
  /** 移すフォルダのパス */
  path: string;
  /** 全フォルダのパス(移動先の候補) */
  folders: string[];
  onClose: () => void;
  /** 移動後に呼ばれる。新しいパスを渡す。 */
  onDone: (newPath: string) => void | Promise<void>;
};

/** フォルダの名称変更・移動ダイアログ(フォルダ名 / 移動先フォルダ)。 */
export function FolderMoveDialog({ path, folders, onClose, onDone }: Props) {
  const i = path.lastIndexOf("/");
  const [name, setName] = useState(path.slice(i + 1));
  const [parent, setParent] = useState(i < 0 ? "" : path.slice(0, i));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 自分自身と、その配下は、移動先にできない
  const targets = useMemo(() => folders.filter((f) => f !== path && !f.startsWith(path + "/")), [folders, path]);

  const to = parent ? `${parent}/${name}` : name;
  const changed = to !== path;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.renameFolder(path, to);
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
        role="dialog"
        aria-modal="true"
        aria-label="フォルダを移動"
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <h2 className="text-lg font-bold">フォルダを移動</h2>
        <p className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium break-all text-gray-800">📁 {path}</p>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500">移動先フォルダ</span>
          <select className={input} value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">📁 ルート</option>
            {targets.map((f) => (
              <option key={f} value={f}>
                📁 {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500">フォルダ名</span>
          <input
            autoFocus
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[/\\]/g, ""))}
          />
        </label>
        <p className="text-xs text-gray-400 break-all">新しいパス: {to || "-"}</p>
        <p className="text-xs text-gray-400">配下のフォルダとドキュメントも、まとめて移ります。</p>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={busy || !changed || !name.trim()}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
