import { ConflictError } from "../../domain/shared/errors";
import { assertValidPassword } from "../../domain/user/password-policy";
import type { PasswordHasher } from "../../domain/user/password-hasher";
import { User } from "../../domain/user/user";
import type { UserRepository } from "../../domain/user/user-repository";
import { Username } from "../../domain/user/username";
import type { Clock, SessionTokenService } from "../ports/ports";
import { toUserInfo } from "../shared/mappers";
import type { LoginResult } from "./login";

export class SetupOwnerUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock,
  ) {}

  /** 初期オーナーを作る。ユーザーが1人もいないときだけ使える。作成後はそのままログインできる。 */
  async execute(input: { username: string; password: string }): Promise<LoginResult> {
    const username = Username.create(input.username);
    assertValidPassword(input.password);
    const user = User.register(username, "owner", await this.hasher.hash(input.password), this.clock.now());
    if (!(await this.users.addIfEmpty(user))) throw new ConflictError("初期設定はすでに完了しています");
    return { user: toUserInfo(user), token: await this.tokens.issue(username.value) };
  }
}
