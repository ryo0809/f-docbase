import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasUsers } from "@/lib/users";
import { LoginForm } from "@/components/LoginForm";
import { SetupForm } from "@/components/SetupForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  const ready = await hasUsers();

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-800">
        <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-sm text-white">f</span>
        f-docbase
      </h1>
      {ready ? (
        <>
          <p className="mb-5 text-sm text-gray-500">ログインしてください。</p>
          <LoginForm next={next} />
        </>
      ) : (
        <>
          <p className="mb-5 text-sm text-gray-500">
            初期設定です。最初のユーザー(オーナー)を作成してください。他のユーザーは、ログイン後に管理ページのユーザー管理タブで追加できます。
          </p>
          <SetupForm />
        </>
      )}
    </div>
  );
}
