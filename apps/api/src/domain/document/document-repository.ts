import type { Document, DocumentSummary } from "./document";
import type { DocumentId } from "./document-id";

export interface DocumentRepository {
  /** 全ドキュメントの要約。id の昇順。 */
  list(): Promise<DocumentSummary[]>;
  find(id: DocumentId): Promise<Document | null>;
  exists(id: DocumentId): Promise<boolean>;
  /** 新規保存する。同じ id が既にあれば ConflictError。 */
  insert(doc: Document): Promise<void>;
  /** 保存済みのドキュメントを更新する。previousId を渡すと、その id のドキュメントを doc の内容(新しい id を含む)に置き換える。 */
  update(doc: Document, previousId?: DocumentId): Promise<void>;
  /** 削除できたら true。存在しなければ false。 */
  delete(id: DocumentId): Promise<boolean>;
  /** 渡した順に、並び順を 1, 2, 3 … と付ける。 */
  setOrder(ids: DocumentId[]): Promise<void>;
}
