import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { PasswordDialog } from "./PasswordDialog";
import { ROLES, ROLE_LABELS, type Role, type UserDetail } from "@f-docbase/shared";
import { api, errorMessage } from "../api/client";

type U = UserDetail;

const input =
  "rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const action = "rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100";

export function UserManager({ users, me, onChange }: { users: U[]; me: string; onChange: () => void }) {
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", password: "", role: "viewer" as Role });
  const [deleting, setDeleting] = useState<U | null>(null);
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(run: () => Promise<unknown>) {
    setError("");
    setNotice("");
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e, "失敗しました"));
      return false;
    }
    onChange();
    return true;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await call(() => api.createUser(form))) setForm({ username: "", password: "", role: "viewer" });
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">ユーザー名</span>
          <input className={input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">パスワード(8文字以上)</span>
          <input type="password" className={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">ロール</span>
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy} className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          ユーザーを作成
        </button>
      </form>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
        {users.map((u) => (
          <li key={u.username} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {u.username}
              {u.username === me && <span className="ml-2 text-xs text-gray-400">(自分)</span>}
            </span>
            <select
              className={input}
              value={u.role}
              disabled={u.username === me}
              title={u.username === me ? "自分自身のロールは変更できません" : ""}
              onChange={(e) => call(() => api.updateUser(u.username, { role: e.target.value as Role }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <button onClick={() => setPasswordFor(u.username)} className={action}>
              パスワード変更
            </button>
            <button
              onClick={() => setDeleting(u)}
              disabled={u.username === me}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-600"
            >
              削除
            </button>
          </li>
        ))}
      </ul>

      {passwordFor && (
        <PasswordDialog
          username={passwordFor}
          onClose={() => setPasswordFor(null)}
          onDone={() => {
            setNotice(`${passwordFor} のパスワードを変更しました`);
            setPasswordFor(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="ユーザーを削除しますか?"
          target={deleting.username}
          busy={busy}
          onConfirm={async () => {
            setBusy(true);
            await call(() => api.deleteUser(deleting.username));
            setBusy(false);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
