import { ValidationError } from "../shared/errors";
import { normalizePath, RESERVED_ROOT } from "../shared/path";

/** ドキュメントの識別子。フォルダ込みのパス(拡張子なし、/ 区切り)。 */
export class DocumentId {
  private constructor(readonly value: string) {}

  static create(raw: string): DocumentId {
    const value = normalizePath(raw.replace(/\.md$/, ""));
    if (value.split("/")[0] === RESERVED_ROOT) {
      throw new ValidationError(`${RESERVED_ROOT} は予約済みの名前です`);
    }
    return new DocumentId(value);
  }

  /** 親フォルダのパス。ルート直下なら空文字。 */
  get folder(): string {
    const i = this.value.lastIndexOf("/");
    return i < 0 ? "" : this.value.slice(0, i);
  }

  /** フォルダを除いた名前 */
  get name(): string {
    return this.value.slice(this.value.lastIndexOf("/") + 1);
  }

  equals(other: DocumentId): boolean {
    return this.value === other.value;
  }
}
