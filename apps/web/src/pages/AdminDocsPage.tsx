import { useAuth } from "../auth/AuthProvider";
import { useDocs } from "../auth/DocsProvider";
import { FolderManager } from "../components/FolderManager";

export function AdminDocsPage() {
  const { can } = useAuth();
  const { docs, folders } = useDocs();
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">フォルダ・ドキュメント管理</h2>
      <p className="mb-4 text-sm text-gray-500">
        フォルダとドキュメントの作成・名称変更・移動・削除はここで行えます。フォルダを変更すると、配下のドキュメントもまとめて移ります。
      </p>
      <FolderManager
        folders={folders}
        docs={docs.map(({ id, title, order }) => ({ id, title, order }))}
        canDelete={can("delete")}
      />
    </div>
  );
}
