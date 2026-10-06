import type { User } from "./user";
import type { Username } from "./username";

export interface UserRepository {
  find(username: Username): Promise<User | null>;
  /** 作成日時の昇順 */
  list(): Promise<User[]>;
  count(): Promise<number>;
  countOwners(): Promise<number>;
  /** 追加する。同じユーザー名が既にあれば ConflictError。 */
  add(user: User): Promise<void>;
  /** ユーザーが1人もいないときだけ追加する。追加できたら true(同時に初期設定されても1人だけになる)。 */
  addIfEmpty(user: User): Promise<boolean>;
  /** ロールとパスワードのハッシュを更新する。 */
  update(user: User): Promise<void>;
  remove(username: Username): Promise<void>;
}
