import type { FolderPath } from "../../domain/folder/folder-path";
import type { FolderRepository } from "../../domain/folder/folder-repository";

export class D1FolderRepository implements FolderRepository {
  constructor(private readonly db: D1Database) {}

  async listExplicit(): Promise<string[]> {
    const { results } = await this.db.prepare("SELECT path FROM folders").all<{ path: string }>();
    return results.map((r) => r.path);
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
    await this.db.batch([
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
    ]);
  }
}
