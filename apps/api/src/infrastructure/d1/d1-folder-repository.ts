import type { FolderPath } from "../../domain/folder/folder-path";
import type { FolderRepository } from "../../domain/folder/folder-repository";
import type { ExplicitFolder } from "../../domain/folder/folder-tree";

/** 親フォルダのパス。最上位なら空文字。 */
const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

export class D1FolderRepository implements FolderRepository {
  constructor(private readonly db: D1Database) {}

  async listExplicit(): Promise<ExplicitFolder[]> {
    const { results } = await this.db.prepare("SELECT path, sort_order FROM folders").all<{ path: string; sort_order: number }>();
    return results.map((r) => ({ path: r.path, order: r.sort_order }));
  }

  async add(path: FolderPath): Promise<void> {
    await this.db.prepare("INSERT OR IGNORE INTO folders (path) VALUES (?)").bind(path.value).run();
  }

  async remove(path: FolderPath): Promise<void> {
    await this.db.prepare("DELETE FROM folders WHERE path = ?").bind(path.value).run();
  }

  async rename(from: FolderPath, to: FolderPath): Promise<void> {
    // フォルダの行と、配下のドキュメントの id を、1回の batch(まとめて成功か失敗)で付け替える。
    // 文字数は SQLite 側の length() で数え、JS の文字列長とずれないようにする。
    const statements = [
      this.db
        .prepare(
          `UPDATE folders SET path = ?1 || substr(path, length(?2) + 1)
           WHERE path = ?2 OR substr(path, 1, length(?2) + 1) = ?2 || '/'`,
        )
        .bind(to.value, from.value),
      this.db
        .prepare(
          `UPDATE documents SET id = ?1 || substr(id, length(?2) + 1)
           WHERE substr(id, 1, length(?2) + 1) = ?2 || '/'`,
        )
        .bind(to.value, from.value),
    ];
    // 別のフォルダへ移したときは、移したフォルダの並び順を未設定に戻す(移動先の最後に並ぶ)
    if (parentOf(from.value) !== parentOf(to.value)) {
      statements.push(this.db.prepare("UPDATE folders SET sort_order = 0 WHERE path = ?").bind(to.value));
    }
    await this.db.batch(statements);
  }

  async setOrder(paths: FolderPath[]): Promise<void> {
    if (paths.length === 0) return;
    await this.db.batch(
      paths.flatMap((p, i) => [
        this.db.prepare("INSERT OR IGNORE INTO folders (path) VALUES (?)").bind(p.value),
        this.db.prepare("UPDATE folders SET sort_order = ? WHERE path = ?").bind(i + 1, p.value),
      ]),
    );
  }
}
