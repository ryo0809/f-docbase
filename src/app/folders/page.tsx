import { listDocs, listFolders } from "@/lib/docs";
import { FolderManager } from "@/components/FolderManager";

export const dynamic = "force-dynamic";

export default async function FoldersPage() {
  const [folders, docs] = await Promise.all([listFolders(), listDocs()]);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-bold">フォルダ・ドキュメント管理</h1>
      <p className="mb-4 text-sm text-gray-500">
        フォルダとドキュメントの作成・名称変更・移動・削除はここで行えます。フォルダを変更すると、配下のドキュメントもまとめて移ります。
      </p>
      <FolderManager folders={folders} docs={docs.map(({ id, title }) => ({ id, title }))} />
    </div>
  );
}
