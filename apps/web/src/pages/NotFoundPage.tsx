import { Link } from "react-router";

export function NotFoundPage({ message = "ドキュメントが見つかりません" }: { message?: string }) {
  return (
    <div className="mx-auto max-w-4xl rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
      <p className="mb-4">{message}</p>
      <Link to="/" className="text-sm text-brand-700 hover:underline">
        ドキュメント一覧へ戻る
      </Link>
    </div>
  );
}
