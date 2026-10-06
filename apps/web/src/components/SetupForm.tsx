import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

/** 初期オーナーの作成フォーム。ユーザーが1人もいないときのログイン画面に表示する。 */
export function SetupForm() {
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.setup(username, password);
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "作成に失敗しました"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">ユーザー名</span>
        <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        <span className="mt-1 block text-xs text-gray-400">英数字と _ . - の3〜32文字</span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">パスワード(8文字以上)</span>
        <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">パスワード(確認)</span>
        <input type="password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        オーナーを作成してログイン
      </button>
    </form>
  );
}
