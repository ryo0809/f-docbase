import type { ReactNode } from "react";
import { Link } from "react-router";
import { ROLE_LABELS } from "@f-docbase/shared";
import { useAuth } from "../auth/AuthProvider";
import { useDocs } from "../auth/DocsProvider";
import { AdminNav } from "../components/AdminNav";
import { LogoutButton } from "../components/LogoutButton";
import { Sidebar } from "../components/Sidebar";

/** ログイン後の共通レイアウト(ヘッダー + サイドバー + 本文)。 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, can } = useAuth();
  const { docs, folders } = useDocs();
  if (!user) return null;
  const canEdit = can("edit");

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-800">
            <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-sm text-white">f</span>
            f-docbase
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {user.username}
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{ROLE_LABELS[user.role]}</span>
            </span>
            {canEdit && (
              <Link
                to="/new"
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                ＋ 新規作成
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Sidebar docs={docs} folders={folders.map((f) => f.path)} />
          </div>
          {canEdit && <AdminNav />}
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </>
  );
}
