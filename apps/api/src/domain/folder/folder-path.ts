import { ValidationError } from "../shared/errors";
import { normalizePath, RESERVED_ROOT } from "../shared/path";

/** フォルダのパス(/ 区切り)。 */
export class FolderPath {
  private constructor(readonly value: string) {}

  static create(raw: string): FolderPath {
    const value = normalizePath(raw);
    if (value.split("/")[0] === RESERVED_ROOT) {
      throw new ValidationError(`${RESERVED_ROOT} は予約済みのフォルダ名です`);
    }
    return new FolderPath(value);
  }

  /** 自身と、その祖先(a/b/c なら a, a/b, a/b/c)。浅い順。 */
  withAncestors(): FolderPath[] {
    const segments = this.value.split("/");
    return segments.map((_, i) => new FolderPath(segments.slice(0, i + 1).join("/")));
  }

  /** other の配下(自分自身は含まない)にあるか */
  isInside(other: FolderPath): boolean {
    return this.value.startsWith(other.value + "/");
  }

  equals(other: FolderPath): boolean {
    return this.value === other.value;
  }
}
