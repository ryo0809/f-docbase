export type FolderSummary = {
  path: string;
  docCount: number;
  /** 同じフォルダの中での並び順。1 以上が設定済み、0 は未設定 */
  order: number;
};

/** 明示的に保存されているフォルダ(空フォルダを含む) */
export type ExplicitFolder = { path: string; order: number };

/** a/b/c の祖先(a, a/b)と自身を、浅い順に返す。 */
function withAncestors(path: string): string[] {
  const segments = path.split("/");
  return segments.map((_, i) => segments.slice(0, i + 1).join("/"));
}

/**
 * フォルダの一覧を導く。明示的に作ったフォルダと、ドキュメントの親フォルダ(祖先を含む)をまとめる。
 * docCount は、そのフォルダの配下(サブフォルダを含む)にあるドキュメント数。
 * order は、明示的に保存されているフォルダの並び順(保存されていなければ 0)。
 */
export function deriveFolders(explicit: ExplicitFolder[], docIds: string[]): FolderSummary[] {
  const orders = new Map(explicit.map((f) => [f.path, f.order]));
  const paths = new Set<string>();
  for (const f of explicit) withAncestors(f.path).forEach((a) => paths.add(a));
  for (const id of docIds) {
    const i = id.lastIndexOf("/");
    if (i > 0) withAncestors(id.slice(0, i)).forEach((a) => paths.add(a));
  }
  return [...paths]
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({
      path,
      docCount: docIds.filter((id) => id.startsWith(path + "/")).length,
      order: orders.get(path) ?? 0,
    }));
}
