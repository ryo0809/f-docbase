import type { FolderInfo } from "@f-docbase/shared";
import type { DocumentRepository } from "../../domain/document/document-repository";
import { FolderPath } from "../../domain/folder/folder-path";
import type { FolderRepository } from "../../domain/folder/folder-repository";
import { deriveFolders } from "../../domain/folder/folder-tree";
import { ConflictError, NotFoundError, ValidationError } from "../../domain/shared/errors";
import type { User } from "../../domain/user/user";
import { requirePermission } from "../shared/authorize";

/** フォルダの一覧(空フォルダとドキュメントの親フォルダをまとめたもの)を読み込む。 */
async function loadTree(folders: FolderRepository, docs: DocumentRepository): Promise<FolderInfo[]> {
  const [explicit, summaries] = await Promise.all([folders.listExplicit(), docs.list()]);
  return deriveFolders(
    explicit,
    summaries.map((d) => d.id.value),
  );
}

export class ListFoldersUseCase {
  constructor(
    private readonly folders: FolderRepository,
    private readonly docs: DocumentRepository,
  ) {}

  async execute(actor: User | null): Promise<FolderInfo[]> {
    requirePermission(actor, "view");
    return loadTree(this.folders, this.docs);
  }
}

export class CreateFolderUseCase {
  constructor(
    private readonly folders: FolderRepository,
    private readonly docs: DocumentRepository,
  ) {}

  async execute(actor: User | null, rawPath: string): Promise<void> {
    requirePermission(actor, "edit");
    const path = FolderPath.create(rawPath);
    const tree = await loadTree(this.folders, this.docs);
    if (tree.some((f) => f.path === path.value)) throw new ConflictError("同名のフォルダが既に存在します");
    for (const p of path.withAncestors()) await this.folders.add(p);
  }
}

export class RenameFolderUseCase {
  constructor(
    private readonly folders: FolderRepository,
    private readonly docs: DocumentRepository,
  ) {}

  /** 名称変更・移動。配下のドキュメントもまとめて新しいパスに移る。 */
  async execute(actor: User | null, rawFrom: string, rawTo: string): Promise<void> {
    requirePermission(actor, "edit");
    const from = FolderPath.create(rawFrom);
    const to = FolderPath.create(rawTo);
    if (from.equals(to)) return;
    if (to.isInside(from)) throw new ValidationError("自分自身の配下には移動できません");
    const tree = await loadTree(this.folders, this.docs);
    if (!tree.some((f) => f.path === from.value)) throw new NotFoundError("フォルダが見つかりません");
    if (tree.some((f) => f.path === to.value)) throw new ConflictError("移動先に同名のフォルダが既に存在します");
    await this.folders.rename(from, to);
  }
}

export class DeleteFolderUseCase {
  constructor(
    private readonly folders: FolderRepository,
    private readonly docs: DocumentRepository,
  ) {}

  /** 空のフォルダだけ削除できる。 */
  async execute(actor: User | null, rawPath: string): Promise<void> {
    requirePermission(actor, "delete");
    const path = FolderPath.create(rawPath);
    const tree = await loadTree(this.folders, this.docs);
    const self = tree.find((f) => f.path === path.value);
    if (!self) throw new NotFoundError("フォルダが見つかりません");
    const hasChildren = tree.some((f) => f.path.startsWith(path.value + "/"));
    if (hasChildren || self.docCount > 0) throw new ConflictError("フォルダが空ではありません");
    await this.folders.remove(path);
  }
}
