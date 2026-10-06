/** 主キー・一意制約の違反か(重複して追加しようとした) */
export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && /UNIQUE constraint failed/i.test(`${e.message} ${(e.cause as Error | undefined)?.message ?? ""}`);
}
