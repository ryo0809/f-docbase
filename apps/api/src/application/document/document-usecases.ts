import type { Doc, DocMeta } from "@f-docbase/shared";
import { Document } from "../../domain/document/document";
import { DocumentId } from "../../domain/document/document-id";
import type { DocumentRepository } from "../../domain/document/document-repository";
import { FolderPath } from "../../domain/folder/folder-path";
import type { FolderRepository } from "../../domain/folder/folder-repository";
import { ConflictError, NotFoundError } from "../../domain/shared/errors";
import type { User } from "../../domain/user/user";
import type { Clock } from "../ports/ports";
import { requirePermission } from "../shared/authorize";
import { toDoc, toDocMeta } from "../shared/mappers";

export type DocumentInputDto = { title: string; tags: string[]; content: string };

/**
 * ドキュメントの親フォルダを、明示的なフォルダとして保存する。
 * ドキュメントを消したり移したりしても、空になったフォルダが消えないようにするため。
 */
async function keepFolder(folders: FolderRepository, id: DocumentId): Promise<void> {
  if (!id.folder) return;
  for (const path of FolderPath.create(id.folder).withAncestors()) await folders.add(path);
}

export class ListDocumentsUseCase {
  constructor(private readonly docs: DocumentRepository) {}

  async execute(actor: User | null): Promise<DocMeta[]> {
    requirePermission(actor, "view");
    return (await this.docs.list()).map(toDocMeta);
  }
}

export class GetDocumentUseCase {
  constructor(private readonly docs: DocumentRepository) {}

  async execute(actor: User | null, rawId: string): Promise<Doc> {
    requirePermission(actor, "view");
    const doc = await this.docs.find(DocumentId.create(rawId));
    if (!doc) throw new NotFoundError("ドキュメントが見つかりません");
    return toDoc(doc);
  }
}

export class CreateDocumentUseCase {
  constructor(
    private readonly docs: DocumentRepository,
    private readonly folders: FolderRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: User | null, input: DocumentInputDto & { id: string }): Promise<{ id: string }> {
    requirePermission(actor, "edit");
    const doc = Document.create(DocumentId.create(input.id), input, this.clock.now());
    await this.docs.insert(doc);
    await keepFolder(this.folders, doc.id);
    return { id: doc.id.value };
  }
}

export class UpdateDocumentUseCase {
  constructor(
    private readonly docs: DocumentRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: User | null, rawId: string, input: DocumentInputDto): Promise<void> {
    requirePermission(actor, "edit");
    const current = await this.docs.find(DocumentId.create(rawId));
    if (!current) throw new NotFoundError("ドキュメントが見つかりません");
    await this.docs.update(current.edit(input, this.clock.now()));
  }
}

export class MoveDocumentUseCase {
  constructor(
    private readonly docs: DocumentRepository,
    private readonly folders: FolderRepository,
    private readonly clock: Clock,
  ) {}

  /** 名称変更・フォルダ移動。to は新しい id(省略すると移動しない)。title を渡すとタイトルも更新する。 */
  async execute(actor: User | null, rawId: string, input: { to?: string; title?: string }): Promise<void> {
    requirePermission(actor, "edit");
    const from = DocumentId.create(rawId);
    const current = await this.docs.find(from);
    if (!current) throw new NotFoundError("ドキュメントが見つかりません");

    const to = input.to ? DocumentId.create(input.to) : from;
    if (!to.equals(from) && (await this.docs.exists(to))) {
      throw new ConflictError("移動先に同名のドキュメントが既に存在します");
    }
    let next = current.moveTo(to);
    if (input.title !== undefined) next = next.retitle(input.title, this.clock.now());
    await this.docs.update(next, from);
    await keepFolder(this.folders, to);
  }
}

export class DeleteDocumentUseCase {
  constructor(private readonly docs: DocumentRepository) {}

  async execute(actor: User | null, rawId: string): Promise<void> {
    requirePermission(actor, "delete");
    if (!(await this.docs.delete(DocumentId.create(rawId)))) throw new NotFoundError("ドキュメントが見つかりません");
  }
}
