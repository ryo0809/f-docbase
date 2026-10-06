import type { FolderPath } from "./folder-path";

/** 明示的に作ったフォルダの保存先。ドキュメントの親フォルダは、ドキュメントの id から導く(folder-tree)。 */
export interface FolderRepository {
  listExplicit(): Promise<string[]>;
  /** すでにあれば何もしない。 */
  add(path: FolderPath): Promise<void>;
  remove(path: FolderPath): Promise<void>;
  /** フォルダを新しいパスへ移す。配下のサブフォルダとドキュメントの id も、まとめて付け替える。 */
  rename(from: FolderPath, to: FolderPath): Promise<void>;
}
