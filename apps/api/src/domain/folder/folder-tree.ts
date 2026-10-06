export type FolderSummary = { path: string; docCount: number };

/** a/b/c の祖先(a, a/b)と自身を、浅い順に返す。 */
function withAncestors(path: string): string[] {
  const segments = path.split("/");
  return segments.map((_, i) => segments.slice(0, i + 1).join("/"));
}

/**
 * フォルダの一覧を導く。明示的に作ったフォルダと、ドキュメントの親フォルダ(祖先を含む)をまとめる。
 * docCount は、そのフォルダの配下(サブフォルダを含む)にあるドキュメント数。
 */
export function deriveFolders(explicit: string[], docIds: string[]): FolderSummary[] {
  const paths = new Set<string>();
  for (const p of explicit) withAncestors(p).forEach((a) => paths.add(a));
  for (const id of docIds) {
    const i = id.lastIndexOf("/");
    if (i > 0) withAncestors(id.slice(0, i)).forEach((a) => paths.add(a));
  }
  return [...paths]
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({ path, docCount: docIds.filter((id) => id.startsWith(path + "/")).length }));
}
