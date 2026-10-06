import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDocs, listFolders } from "@/lib/docs";
import { can } from "@/lib/roles";
import { FolderManager } from "@/components/FolderManager";

export const dynamic = "force-dynamic";

export default async function FoldersPage() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "edit")) redirect("/");
  const [folders, docs] = await Promise.all([listFolders(), listDocs()]);
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">フォルダ・ドキュメント管理</h2>
      <p className="mb-4 text-sm text-gray-500">
        フォルダとドキュメントの作成・名称変更・移動・削除はここで行えます。フォルダを変更すると、配下のドキュメントもまとめて移ります。
      </p>
      <FolderManager
        folders={folders}
        docs={docs.map(({ id, title }) => ({ id, title }))}
        canDelete={can(user.role, "delete")}
      />
    </div>
  );
}
