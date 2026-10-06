import type { TemplateInfo } from "@f-docbase/shared";

export interface Clock {
  now(): Date;
}

/** 重複しない文字列(ファイル名などに使う)を作る。 */
export interface IdGenerator {
  next(): string;
}

/** ログイン状態を表すトークン(署名付き)。 */
export interface SessionTokenService {
  issue(username: string): Promise<string>;
  /** 署名と有効期限が正しければユーザー名、そうでなければ null。 */
  verify(token: string | undefined): Promise<string | null>;
}

export interface TemplateCatalog {
  list(): readonly TemplateInfo[];
}
