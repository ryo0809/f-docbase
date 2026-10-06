/** パスワードのハッシュ化。実装(アルゴリズム)は infrastructure に置く。 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /**
   * stored が null(該当ユーザーがいない)のときも、ハッシュ計算を行って false を返す。
   * ユーザーの有無を、応答時間から推測されないようにするため。
   */
  verify(password: string, stored: string | null): Promise<boolean>;
}
