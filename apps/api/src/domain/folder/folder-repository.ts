import type { FolderPath } from "./folder-path";
import type { ExplicitFolder } from "./folder-tree";

/** 明示的に作ったフォルダの保存先。ドキュメントの親フォルダは、ドキュメントの id から導く(folder-tree)。 */
export interface FolderRepository {
  listExplicit(): Promise<ExplicitFolder[]>;
  /** すでにあれば何もしない。 */
  add(path: FolderPath): Promise<void>;
  remove(path: FolderPath): Promise<void>;
  /**
   * フォルダを新しいパスへ移す。配下のサブフォルダとドキュメントの id も、まとめて付け替える。
   * 別のフォルダへ移したとき(親が変わったとき)は、移したフォルダの並び順を未設定に戻す。
   */
  rename(from: FolderPath, to: FolderPath): Promise<void>;
  /**
   * 渡した順に、並び順を 1, 2, 3 … と付ける。まだ保存されていないフォルダ(ドキュメントの親として
   * 導かれているだけのもの)は、明示的なフォルダとして保存する。
   */
  setOrder(paths: FolderPath[]): Promise<void>;
}
