import { Link, useLocation } from "react-router";
import { ApiError, api, encodeId } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useDocs } from "../auth/DocsProvider";
import { DeleteButton } from "../components/DeleteButton";
import { Markdown } from "../components/Markdown";
import { MoveDocButton } from "../components/MoveDocButton";
import { useAsync } from "../hooks/useAsync";
import { docIdFromPath } from "../hooks/docId";
import { NotFoundPage } from "./NotFoundPage";

export function DocPage() {
  const { pathname } = useLocation();
  const id = docIdFromPath(pathname, "/docs/");
  const { can } = useAuth();
  const { folders } = useDocs();
  const { data: doc, loading, error } = useAsync(() => api.getDoc(id), [id]);

  if (loading && !doc) return null;
  if (error instanceof ApiError && error.status !== 404) {
    return <NotFoundPage message={error.message} />;
  }
  if (!doc) return <NotFoundPage />;

  const enc = encodeId(id);

  return (
    <article className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="mb-1 text-xs text-gray-400">📁 {id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : "ルート"}</div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <div className="flex shrink-0 gap-2 text-sm">
            {can("edit") && (
              <>
                <Link
                  to={`/edit/${enc}`}
                  className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
                >
                  編集
                </Link>
                <MoveDocButton doc={{ id, title: doc.title }} folders={folders.map((f) => f.path)} />
              </>
            )}
            {can("delete") && <DeleteButton id={id} title={doc.title} />}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {doc.tags.map((t) => (
            <Link
              key={t}
              to={`/?tag=${encodeURIComponent(t)}`}
              className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700 hover:bg-brand-100"
            >
              {t}
            </Link>
          ))}
          <span className="ml-auto">更新: {new Date(doc.updated).toLocaleString("ja-JP")}</span>
        </div>
      </div>
      <Markdown content={doc.content} toc />
    </article>
  );
}
