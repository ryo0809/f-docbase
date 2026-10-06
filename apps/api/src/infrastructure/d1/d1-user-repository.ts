import type { Role } from "@f-docbase/shared";
import { ConflictError } from "../../domain/shared/errors";
import { User } from "../../domain/user/user";
import type { UserRepository } from "../../domain/user/user-repository";
import { Username } from "../../domain/user/username";
import { isUniqueViolation } from "./d1-errors";

type Row = { username: string; role: Role; password_hash: string; created_at: string };

function toUser(r: Row): User {
  return User.restore(Username.create(r.username), r.role, r.password_hash, new Date(r.created_at));
}

export class D1UserRepository implements UserRepository {
  constructor(private readonly db: D1Database) {}

  async find(username: Username): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT username, role, password_hash, created_at FROM users WHERE username = ?")
      .bind(username.value)
      .first<Row>();
    return row ? toUser(row) : null;
  }

  async list(): Promise<User[]> {
    const { results } = await this.db
      .prepare("SELECT username, role, password_hash, created_at FROM users ORDER BY created_at, username")
      .all<Row>();
    return results.map(toUser);
  }

  async count(): Promise<number> {
    return (await this.db.prepare("SELECT COUNT(*) AS n FROM users").first<number>("n")) ?? 0;
  }

  async countOwners(): Promise<number> {
    return (await this.db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'").first<number>("n")) ?? 0;
  }

  async add(user: User): Promise<void> {
    try {
      await this.db
        .prepare("INSERT INTO users (username, role, password_hash, created_at) VALUES (?, ?, ?, ?)")
        .bind(user.username.value, user.role, user.passwordHash, user.createdAt.toISOString())
        .run();
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictError("そのユーザー名はすでに使われています");
      throw e;
    }
  }

  async addIfEmpty(user: User): Promise<boolean> {
    // 存在確認と挿入を1文で行い、同時に初期設定されても1人しか作られないようにする
    const res = await this.db
      .prepare(
        `INSERT INTO users (username, role, password_hash, created_at)
         SELECT ?1, ?2, ?3, ?4 WHERE NOT EXISTS (SELECT 1 FROM users)`,
      )
      .bind(user.username.value, user.role, user.passwordHash, user.createdAt.toISOString())
      .run();
    return res.meta.changes > 0;
  }

  async update(user: User): Promise<void> {
    await this.db
      .prepare("UPDATE users SET role = ?, password_hash = ? WHERE username = ?")
      .bind(user.role, user.passwordHash, user.username.value)
      .run();
  }

  async remove(username: Username): Promise<void> {
    await this.db.prepare("DELETE FROM users WHERE username = ?").bind(username.value).run();
  }
}
