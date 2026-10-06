import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

/** ログイン成功後は AuthProvider の状態が更新され、LoginPage が next へ遷移させる。 */
export function LoginForm() {
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(username, password);
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "ログインに失敗しました"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">ユーザー名</span>
        <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">パスワード</span>
        <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        ログイン
      </button>
    </form>
  );
}
