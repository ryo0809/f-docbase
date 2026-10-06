import { isRole, type Role, type UserDetail } from "@f-docbase/shared";
import { NotFoundError, ValidationError } from "../../domain/shared/errors";
import { assertValidPassword } from "../../domain/user/password-policy";
import type { PasswordHasher } from "../../domain/user/password-hasher";
import { User } from "../../domain/user/user";
import type { UserRepository } from "../../domain/user/user-repository";
import { Username } from "../../domain/user/username";
import type { Clock } from "../ports/ports";
import { requirePermission } from "../shared/authorize";
import { toUserDetail } from "../shared/mappers";

function parseRole(value: unknown): Role {
  if (!isRole(value)) throw new ValidationError("ロールが正しくありません");
  return value;
}

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(actor: User | null): Promise<UserDetail[]> {
    requirePermission(actor, "manageUsers");
    return (await this.users.list()).map(toUserDetail);
  }
}

export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(actor: User | null, input: { username: string; password: string; role: unknown }): Promise<UserDetail> {
    requirePermission(actor, "manageUsers");
    const role = parseRole(input.role);
    const username = Username.create(input.username);
    assertValidPassword(input.password);
    const user = User.register(username, role, await this.hasher.hash(input.password), this.clock.now());
    await this.users.add(user);
    return toUserDetail(user);
  }
}

export class UpdateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(actor: User | null, target: string, patch: { role?: unknown; password?: string }): Promise<void> {
    const me = requirePermission(actor, "manageUsers");
    const username = Username.tryCreate(target);
    const current = username ? await this.users.find(username) : null;
    if (!current) throw new NotFoundError("ユーザーが見つかりません");

    let next = current;
    if (patch.role !== undefined) {
      const role = parseRole(patch.role);
      if (current.username.equals(me.username) && role !== me.role) {
        throw new ValidationError("自分自身のロールは変更できません");
      }
      next = next.withRole(role, await this.users.countOwners());
    }
    if (patch.password !== undefined) {
      assertValidPassword(patch.password);
      next = next.withPasswordHash(await this.hasher.hash(patch.password));
    }
    await this.users.update(next);
  }
}

export class DeleteUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(actor: User | null, target: string): Promise<void> {
    const me = requirePermission(actor, "manageUsers");
    const username = Username.tryCreate(target);
    const current = username ? await this.users.find(username) : null;
    if (!current) throw new NotFoundError("ユーザーが見つかりません");
    if (current.username.equals(me.username)) throw new ValidationError("自分自身は削除できません");
    current.assertRemovable(await this.users.countOwners());
    await this.users.remove(current.username);
  }
}
