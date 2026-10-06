import type { UserInfo } from "@f-docbase/shared";
import { UnauthenticatedError } from "../../domain/shared/errors";
import type { PasswordHasher } from "../../domain/user/password-hasher";
import type { UserRepository } from "../../domain/user/user-repository";
import { Username } from "../../domain/user/username";
import type { SessionTokenService } from "../ports/ports";
import { toUserInfo } from "../shared/mappers";

export type LoginInput = { username: string; password: string };
export type LoginResult = { user: UserInfo; token: string };

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: SessionTokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const username = Username.tryCreate(input.username);
    const user = username ? await this.users.find(username) : null;
    // ユーザーがいなくても必ずハッシュ計算を行い、応答時間でユーザーの有無が分からないようにする
    const ok = await this.hasher.verify(input.password, user?.passwordHash ?? null);
    if (!user || !ok) throw new UnauthenticatedError("ユーザー名またはパスワードが正しくありません");
    return { user: toUserInfo(user), token: await this.tokens.issue(user.username.value) };
  }
}
