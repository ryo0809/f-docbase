import type { Context } from "hono";
import { ValidationError } from "../../domain/shared/errors";
import type { AppEnv } from "./types";

/** JSON のリクエストボディ。読めない・オブジェクトでない場合は空のオブジェクト。 */
export async function readJson(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  const body: unknown = await c.req.json().catch(() => ({}));
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function strOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** /api/<prefix>/ 以降のパスを、セグメントごとにデコードして / でつなぐ(ドキュメント id 用)。 */
export function idAfter(c: Context<AppEnv>, prefix: string): string {
  const rest = new URL(c.req.url).pathname.slice(prefix.length);
  try {
    return rest.split("/").map(decodeURIComponent).join("/");
  } catch {
    throw new ValidationError("パスが正しくありません");
  }
}
