import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { AdminTabs } from "@/components/AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "edit")) redirect("/");

  // 権限のあるタブだけ表示する(ユーザー管理はオーナーのみ)
  const tabs = [
    { href: "/admin/docs", label: "ドキュメント管理" },
    ...(can(user.role, "manageUsers") ? [{ href: "/admin/users", label: "ユーザー管理" }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-xl font-bold">管理</h1>
      <AdminTabs tabs={tabs} />
      {children}
    </div>
  );
}
