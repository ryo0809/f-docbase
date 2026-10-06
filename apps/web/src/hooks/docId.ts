/** `/docs/<seg>/<seg>` のようなパスから、デコード済みのドキュメント id を取り出す。 */
export function docIdFromPath(pathname: string, prefix: string): string {
  return pathname
    .slice(prefix.length)
    .split("/")
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join("/");
}
