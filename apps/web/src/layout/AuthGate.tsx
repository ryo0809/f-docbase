import { Navigate, Outlet, useLocation } from "react-router";
import type { Permission } from "@f-docbase/shared";
import { useAuth } from "../auth/AuthProvider";
import { DocsProvider } from "../auth/DocsProvider";
import { AppShell } from "./AppShell";

/** 未ログインなら /login?next=... へ。ログイン済みなら一覧データを用意してヘッダー・サイドバー付きで表示する。 */
export function AuthGate() {
  const { loading, user } = useAuth();
  const { pathname, search } = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;

  return (
    <DocsProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </DocsProvider>
  );
}

/** 権限がなければ / へリダイレクトするルートガード。 */
export function RequirePermission({ permission }: { permission: Permission }) {
  const { can } = useAuth();
  if (!can(permission)) return <Navigate to="/" replace />;
  return <Outlet />;
}
