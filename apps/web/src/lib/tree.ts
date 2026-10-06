import { compareByOrder } from "@f-docbase/shared";

/** ツリーに載せるドキュメント */
export type TreeDoc = { id: string; title: string; order: number };

/** ツリーに載せるフォルダ(空フォルダを含む) */
export type TreeFolder = { path: string; order: number };

export type TreeNode<D extends TreeDoc = TreeDoc> = {
  /** フォルダ名(最上位は空文字) */
  name: string;
  /** フォルダのパス(最上位は空文字) */
  path: string;
  /** 同じフォルダの中での並び順(1 以上が設定済み、0 は未設定) */
  order: number;
  folders: TreeNode<D>[];
  docs: D[];
};

const leaf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/**
 * フォルダとドキュメントから、ツリーを作る。同じフォルダの直下では、フォルダが先、ドキュメントが後。
 * それぞれ、並び順(設定済みが先、未設定は名前順)で並べる。
 */
export function buildTree<D extends TreeDoc>(docs: D[], folders: TreeFolder[]): TreeNode<D> {
  const root: TreeNode<D> = { name: "", path: "", order: 0, folders: [], docs: [] };
  const orders = new Map(folders.map((f) => [f.path, f.order]));

  /** パスに対応するノードを(無ければ作りながら)辿る */
  const ensure = (parts: string[]): TreeNode<D> => {
    let cur = root;
    for (const name of parts) {
      const path = cur.path ? `${cur.path}/${name}` : name;
      let next = cur.folders.find((f) => f.name === name);
      if (!next) {
        next = { name, path, order: orders.get(path) ?? 0, folders: [], docs: [] };
        cur.folders.push(next);
      }
      cur = next;
    }
    return cur;
  };
  // 空のフォルダも表示できるよう、ドキュメントとは別にフォルダ一覧からも作る
  for (const f of folders) ensure(f.path.split("/"));
  for (const d of docs) ensure(d.id.split("/").slice(0, -1)).docs.push(d);

  const sort = (node: TreeNode<D>) => {
    node.folders.sort((a, b) => compareByOrder({ order: a.order, name: a.name }, { order: b.order, name: b.name }));
    node.docs.sort((a, b) => compareByOrder({ order: a.order, name: leaf(a.id) }, { order: b.order, name: leaf(b.id) }));
    node.folders.forEach(sort);
  };
  sort(root);
  return root;
}
