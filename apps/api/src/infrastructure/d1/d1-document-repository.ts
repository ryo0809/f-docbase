import { Document, type DocumentSummary } from "../../domain/document/document";
import { DocumentId } from "../../domain/document/document-id";
import type { DocumentRepository } from "../../domain/document/document-repository";
import { ConflictError, NotFoundError } from "../../domain/shared/errors";
import { isUniqueViolation } from "./d1-errors";

type SummaryRow = { id: string; title: string; tags: string; updated_at: string };
type Row = SummaryRow & { content: string };

function parseTags(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function toSummary(r: SummaryRow): DocumentSummary {
  return { id: DocumentId.create(r.id), title: r.title, tags: parseTags(r.tags), updatedAt: new Date(r.updated_at) };
}

export class D1DocumentRepository implements DocumentRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<DocumentSummary[]> {
    const { results } = await this.db.prepare("SELECT id, title, tags, updated_at FROM documents").all<SummaryRow>();
    return results.map(toSummary).sort((a, b) => a.id.value.localeCompare(b.id.value));
  }

  async find(id: DocumentId): Promise<Document | null> {
    const row = await this.db
      .prepare("SELECT id, title, tags, content, updated_at FROM documents WHERE id = ?")
      .bind(id.value)
      .first<Row>();
    return row ? Document.restore({ ...toSummary(row), content: row.content }) : null;
  }

  async exists(id: DocumentId): Promise<boolean> {
    return (await this.db.prepare("SELECT 1 AS x FROM documents WHERE id = ?").bind(id.value).first()) !== null;
  }

  async insert(doc: Document): Promise<void> {
    try {
      await this.db
        .prepare("INSERT INTO documents (id, title, tags, content, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(doc.id.value, doc.title, JSON.stringify(doc.tags), doc.content, doc.updatedAt.toISOString())
        .run();
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictError("同名のドキュメントが既に存在します");
      throw e;
    }
  }

  async update(doc: Document, previousId: DocumentId = doc.id): Promise<void> {
    try {
      const res = await this.db
        .prepare("UPDATE documents SET id = ?, title = ?, tags = ?, content = ?, updated_at = ? WHERE id = ?")
        .bind(doc.id.value, doc.title, JSON.stringify(doc.tags), doc.content, doc.updatedAt.toISOString(), previousId.value)
        .run();
      if (res.meta.changes === 0) throw new NotFoundError("ドキュメントが見つかりません");
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictError("移動先に同名のドキュメントが既に存在します");
      throw e;
    }
  }

  async delete(id: DocumentId): Promise<boolean> {
    const res = await this.db.prepare("DELETE FROM documents WHERE id = ?").bind(id.value).run();
    return res.meta.changes > 0;
  }
}
