import { ValidationError } from "../shared/errors";
import type { DocumentId } from "./document-id";

const MAX_TITLE = 200;
const MAX_TAGS = 30;
const MAX_TAG = 50;
// D1 の1行の上限(2MB)に収まるよう、日本語(1文字3バイト)でも余裕を持たせる
const MAX_CONTENT = 400_000;

export type DocumentProps = {
  id: DocumentId;
  title: string;
  tags: string[];
  content: string;
  updatedAt: Date;
};

export type DocumentInput = { title: string; tags: string[]; content: string };

/** 一覧用の要約(本文を含まない) */
export type DocumentSummary = Omit<DocumentProps, "content">;

function normalizeTags(tags: string[]): string[] {
  const cleaned = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  if (cleaned.length > MAX_TAGS) throw new ValidationError(`タグは${MAX_TAGS}個までです`);
  if (cleaned.some((t) => t.length > MAX_TAG)) throw new ValidationError(`タグは${MAX_TAG}文字までです`);
  return cleaned;
}

function normalizeTitle(title: string, id: DocumentId): string {
  const t = title.trim() || id.name;
  if (t.length > MAX_TITLE) throw new ValidationError(`タイトルは${MAX_TITLE}文字までです`);
  return t;
}

function checkContent(content: string): string {
  if (content.length > MAX_CONTENT) throw new ValidationError("本文が長すぎます");
  return content;
}

export class Document {
  private constructor(private readonly props: DocumentProps) {}

  /** 新規作成する。更新日時は now になる。 */
  static create(id: DocumentId, input: DocumentInput, now: Date): Document {
    return new Document({
      id,
      title: normalizeTitle(input.title, id),
      tags: normalizeTags(input.tags),
      content: checkContent(input.content),
      updatedAt: now,
    });
  }

  /** 保存済みのデータから復元する(検証しない)。 */
  static restore(props: DocumentProps): Document {
    return new Document(props);
  }

  get id(): DocumentId {
    return this.props.id;
  }
  get title(): string {
    return this.props.title;
  }
  get tags(): string[] {
    return [...this.props.tags];
  }
  get content(): string {
    return this.props.content;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** タイトル・タグ・本文を更新する。更新日時は now になる。 */
  edit(input: DocumentInput, now: Date): Document {
    return new Document({
      id: this.props.id,
      title: normalizeTitle(input.title, this.props.id),
      tags: normalizeTags(input.tags),
      content: checkContent(input.content),
      updatedAt: now,
    });
  }

  /** 別のパスへ移す。更新日時は変えない。 */
  moveTo(id: DocumentId): Document {
    return new Document({ ...this.props, id });
  }

  /** タイトルだけを変える。変わったときだけ更新日時を now にする。 */
  retitle(title: string, now: Date): Document {
    const next = normalizeTitle(title, this.props.id);
    if (next === this.props.title) return this;
    return new Document({ ...this.props, title: next, updatedAt: now });
  }

  toSummary(): DocumentSummary {
    const { content: _content, ...summary } = this.props;
    return summary;
  }
}
