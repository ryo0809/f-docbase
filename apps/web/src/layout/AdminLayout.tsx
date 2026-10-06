import { Outlet } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { AdminTabs } from "../components/AdminTabs";

/** 管理ページの共通枠(権限のあるタブだけ表示。ユーザー管理はオーナーのみ)。 */
export function AdminLayout() {
  const { can } = useAuth();
  const tabs = [
    { href: "/admin/docs", label: "ドキュメント管理" },
    ...(can("manageUsers") ? [{ href: "/admin/users", label: "ユーザー管理" }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-xl font-bold">管理</h1>
      <AdminTabs tabs={tabs} />
      <Outlet />
    </div>
  );
}
