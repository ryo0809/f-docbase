import { useEffect, useState } from "react";
import { api, errorMessage } from "../api/client";

type Props = {
  username: string;
  onClose: () => void;
  /** パスワードの変更に成功したとき */
  onDone: () => void;
};

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

/** ユーザーのパスワードを変更するダイアログ。 */
export function PasswordDialog({ username, onClose, onDone }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.updateUser(username, { password });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "パスワードの変更に失敗しました"));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="パスワードを変更"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-bold text-gray-900">パスワードを変更</h2>
        <p className="mt-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium break-all text-gray-800">{username}</p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">新しいパスワード(8文字以上)</span>
            <input
              type="password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">新しいパスワード(確認)</span>
            <input
              type="password"
              className={input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            disabled={busy}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "変更中…" : "変更する"}
          </button>
        </div>
      </form>
    </div>
  );
}
