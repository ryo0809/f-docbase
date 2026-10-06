/** 並び順を持つ項目(同じフォルダの中のフォルダ同士・ドキュメント同士で比べる)。 */
export type Orderable = {
  /** 並び順。1 以上が設定済み。0 は未設定 */
  order: number;
  /** 並び順が同じとき(未設定どうしを含む)に、名前で並べるためのキー */
  name: string;
};

/**
 * 並び順の比較。設定済み(1 以上)を昇順で先に、未設定(0)は、その後ろに名前順で並べる。
 * 新しく作ったものや、別のフォルダへ移したものは未設定になるので、最後に並ぶ。
 */
export function compareByOrder(a: Orderable, b: Orderable): number {
  const ka = a.order > 0 ? a.order : Number.POSITIVE_INFINITY;
  const kb = b.order > 0 ? b.order : Number.POSITIVE_INFINITY;
  if (ka !== kb) return ka < kb ? -1 : 1;
  return a.name.localeCompare(b.name);
}
