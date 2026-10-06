import { ValidationError } from "./errors";

/** 画像用に予約されている最上位の名前。ドキュメントやフォルダには使えない。 */
export const RESERVED_ROOT = "assets";

const MAX_PATH_LENGTH = 300;

/** パスを正規化する。区切りは / に揃え、前後の / を除く。空の要素・. ・.. ・制御文字は不正。 */
export function normalizePath(raw: string): string {
  const clean = raw.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const segments = clean.split("/");
  const invalid = segments.some((s) => !s || s === "." || s === ".." || /[\u0000-\u001f]/.test(s));
  if (!clean || invalid) throw new ValidationError("パスが正しくありません");
  if (clean.length > MAX_PATH_LENGTH) throw new ValidationError("パスが長すぎます");
  return clean;
}
