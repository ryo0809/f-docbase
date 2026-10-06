import type { User } from "../../domain/user/user";
import type { UserRepository } from "../../domain/user/user-repository";
import { Username } from "../../domain/user/username";
import type { SessionTokenService } from "../ports/ports";

/** トークンからログイン中のユーザーを求める。ロールは毎回保存先から読むため、変更や削除がすぐ反映される。 */
export class AuthenticateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: SessionTokenService,
  ) {}

  async execute(token: string | undefined): Promise<User | null> {
    const name = await this.tokens.verify(token);
    const username = name ? Username.tryCreate(name) : null;
    return username ? this.users.find(username) : null;
  }
}
