import type { Permission } from "@f-docbase/shared";
import { ForbiddenError, UnauthenticatedError } from "../../domain/shared/errors";
import type { User } from "../../domain/user/user";

/** ログイン済みで、かつ permission を持っていることを確かめる。満たさなければ例外。 */
export function requirePermission(actor: User | null, permission: Permission): User {
  if (!actor) throw new UnauthenticatedError();
  if (!actor.can(permission)) throw new ForbiddenError();
  return actor;
}
