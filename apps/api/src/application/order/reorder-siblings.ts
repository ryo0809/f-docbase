import { DocumentId } from "../../domain/document/document-id";
import type { DocumentRepository } from "../../domain/document/document-repository";
import { FolderPath } from "../../domain/folder/folder-path";
import type { FolderRepository } from "../../domain/folder/folder-repository";
import { deriveFolders } from "../../domain/folder/folder-tree";
import { NotFoundError, ValidationError } from "../../domain/shared/errors";
import type { User } from "../../domain/user/user";
import { requirePermission } from "../shared/authorize";

export type ReorderInput = {
  /** 並び替えるフォルダ(最上位は空文字) */
  parent: string;
  /** その直下のフォルダを、並べたい順に(フォルダ自身のパス)。省略すると変えない */
  folders?: string[];
  /** その直下のドキュメントを、並べたい順に(ドキュメントの id)。省略すると変えない */
  docs?: string[];
};

const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

function assertNoDuplicates(items: string[]): void {
  if (new Set(items).size !== items.length) throw new ValidationError("同じ項目が重複しています");
}

export class ReorderSiblingsUseCase {
  constructor(
    private readonly folders: FolderRepository,
    private readonly docs: DocumentRepository,
  ) {}

  /**
   * 同じフォルダの直下にある、フォルダ同士・ドキュメント同士の並び順を決める。
   * 渡した順に 1, 2, 3 … と付ける(渡さなかったものは変えない)。
   */
  async execute(actor: User | null, input: ReorderInput): Promise<void> {
    requirePermission(actor, "edit");
    const parent = input.parent === "" ? "" : FolderPath.create(input.parent).value;
    const folderPaths = input.folders ?? [];
    const docIds = input.docs ?? [];
    assertNoDuplicates(folderPaths);
    assertNoDuplicates(docIds);

    const [explicit, summaries] = await Promise.all([this.folders.listExplicit(), this.docs.list()]);
    const tree = deriveFolders(
      explicit,
      summaries.map((d) => d.id.value),
    );

    const paths = folderPaths.map((p) => FolderPath.create(p));
    for (const p of paths) {
      if (parentOf(p.value) !== parent) throw new ValidationError("別のフォルダの項目は、並び替えられません");
      if (!tree.some((f) => f.path === p.value)) throw new NotFoundError("フォルダが見つかりません");
    }
    const ids = docIds.map((id) => DocumentId.create(id));
    for (const id of ids) {
      if (id.folder !== parent) throw new ValidationError("別のフォルダの項目は、並び替えられません");
      if (!summaries.some((d) => d.id.equals(id))) throw new NotFoundError("ドキュメントが見つかりません");
    }

    await this.folders.setOrder(paths);
    await this.docs.setOrder(ids);
  }
}
