import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listUsers } from "@/lib/users";
import { UserManager } from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "manageUsers")) redirect("/");

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">ユーザー管理</h2>
      <p className="mb-4 text-sm text-gray-500">
        ユーザーの作成、ロールの設定、パスワードの変更ができます。オーナーは閲覧・編集・削除・ユーザー管理、開発メンバーは閲覧・編集(削除は不可)、一般メンバーは閲覧のみです。
      </p>
      <UserManager users={await listUsers()} me={user.username} />
    </div>
  );
}
