import type { Role } from "@f-docbase/shared";
import { can, type Permission } from "@f-docbase/shared";
import { ConflictError } from "../shared/errors";
import type { Username } from "./username";

export class User {
  private constructor(
    readonly username: Username,
    readonly role: Role,
    readonly passwordHash: string,
    readonly createdAt: Date,
  ) {}

  static register(username: Username, role: Role, passwordHash: string, now: Date): User {
    return new User(username, role, passwordHash, now);
  }

  /** 保存済みのデータから復元する。 */
  static restore(username: Username, role: Role, passwordHash: string, createdAt: Date): User {
    return new User(username, role, passwordHash, createdAt);
  }

  can(permission: Permission): boolean {
    return can(this.role, permission);
  }

  isOwner(): boolean {
    return this.role === "owner";
  }

  withPasswordHash(passwordHash: string): User {
    return new User(this.username, this.role, passwordHash, this.createdAt);
  }

  /** ロールを変える。最後のオーナーは降格できない(ownerCount は現在のオーナー数)。 */
  withRole(role: Role, ownerCount: number): User {
    if (role !== this.role && this.isOwner() && ownerCount <= 1) {
      throw new ConflictError("最後のオーナーのロールは変更できません");
    }
    return new User(this.username, role, this.passwordHash, this.createdAt);
  }

  /** 削除できるかを確かめる。最後のオーナーは削除できない。 */
  assertRemovable(ownerCount: number): void {
    if (this.isOwner() && ownerCount <= 1) throw new ConflictError("最後のオーナーは削除できません");
  }
}
