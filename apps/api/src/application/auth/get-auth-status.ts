import type { AuthStatus } from "@f-docbase/shared";
import type { User } from "../../domain/user/user";
import type { UserRepository } from "../../domain/user/user-repository";
import { toUserInfo } from "../shared/mappers";

export class GetAuthStatusUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(actor: User | null): Promise<AuthStatus> {
    return {
      setupRequired: (await this.users.count()) === 0,
      user: actor ? toUserInfo(actor) : null,
    };
  }
}
