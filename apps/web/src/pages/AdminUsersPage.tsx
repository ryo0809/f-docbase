import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { UserManager } from "../components/UserManager";
import { useAsync } from "../hooks/useAsync";

export function AdminUsersPage() {
  const { user } = useAuth();
  const { data: users, reload } = useAsync(() => api.listUsers(), []);

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">ユーザー管理</h2>
      <p className="mb-4 text-sm text-gray-500">
        ユーザーの作成、ロールの設定、パスワードの変更ができます。オーナーは閲覧・編集・削除・ユーザー管理、開発メンバーは閲覧・編集(削除は不可)、一般メンバーは閲覧のみです。
      </p>
      {users && user && <UserManager users={users} me={user.username} onChange={reload} />}
    </div>
  );
}
