import type { Container } from "../../container";
import type { User } from "../../domain/user/user";

/** wrangler.jsonc のバインディング */
export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

export type AppEnv = {
  Bindings: Env;
  Variables: {
    container: Container;
    /** ログイン中のユーザー。未ログインなら null */
    user: User | null;
  };
};
