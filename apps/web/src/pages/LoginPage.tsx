import { Navigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { LoginForm } from "../components/LoginForm";
import { SetupForm } from "../components/SetupForm";

export function LoginPage() {
  const { loading, user, setupRequired } = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next");

  if (loading) return null;
  if (user) {
    // オープンリダイレクトを避けるため、同一サイト内のパスだけを許可する
    return <Navigate to={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} replace />;
  }

  return (
    <main className="p-4">
      <div className="mx-auto mt-24 max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-800">
          <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-sm text-white">f</span>
          f-docbase
        </h1>
        {setupRequired ? (
          <>
            <p className="mb-5 text-sm text-gray-500">
              初期設定です。最初のユーザー(オーナー)を作成してください。他のユーザーは、ログイン後に管理ページのユーザー管理タブで追加できます。
            </p>
            <SetupForm />
          </>
        ) : (
          <>
            <p className="mb-5 text-sm text-gray-500">ログインしてください。</p>
            <LoginForm />
          </>
        )}
      </div>
    </main>
  );
}
