// D1 のドキュメント・フォルダ・画像・並び順を、docs/ の Markdown などに書き出す(スナップショット)。
//   npm run export-docs [-- --local] [-- --dir <書き出し先>] [-- --prune]
// 既定は本番(リモート)の D1。--local でローカルの D1。
// ドキュメントの正は D1。docs/ は、Git で履歴を残し、バックアップや再現に使うためのスナップショット。
// 書き出し先のファイルは、上書きするだけ。D1 にないドキュメント・画像のファイルは、既定では残して知らせる。
// --prune を付けると、D1 にないファイルを削除して、書き出し先を D1 と同じ内容にそろえる(D1 で削除したものを反映するとき)。
// 本番にまだ取り込んでいないドキュメントが、docs/ から消えないよう、先に import-docs で投入してから、--prune を使うこと。
// D1 にドキュメントが1件もないときは、取り違えを避けるため、何も書き換えずに終わる。
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { LOCAL, REMOTE, d1Query } from "./lib/d1.mjs";

const args = process.argv.slice(2);
const target = args.includes("--local") ? LOCAL : REMOTE;
const dirFlag = args.indexOf("--dir");
const pruneFiles = args.includes("--prune");
const root = resolve(
  dirFlag >= 0 ? args[dirFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs"),
);
const ORDER_FILE = "_order.json";
const posix = (p) => p.split(sep).join("/");

let documents, folders, assets;
try {
  documents = d1Query(target, "SELECT * FROM documents");
  folders = d1Query(target, "SELECT * FROM folders");
  assets = d1Query(target, "SELECT name, content_type, data FROM assets");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

if (documents.length === 0) {
  console.error(`${target.label}の D1 にドキュメントがありません。取り違えを避けるため、何も書き換えません`);
  process.exit(1);
}

mkdirSync(root, { recursive: true });
const wanted = new Set(); // 書き出す Markdown の、root からの相対パス
const problems = [];
let written = 0;

// 1) ドキュメント
for (const d of documents) {
  const rel = `${d.id}.md`;
  const file = join(root, ...rel.split("/"));
  try {
    mkdirSync(dirname(file), { recursive: true });
    const tags = (() => {
      try {
        return JSON.parse(d.tags);
      } catch {
        return [];
      }
    })();
    const data = { title: d.title, ...(tags.length ? { tags } : {}), updated: d.updated_at };
    writeFileSync(file, matter.stringify(d.content, data));
    wanted.add(rel);
    written++;
  } catch (e) {
    problems.push(`${d.id}: ${e.message}`);
  }
}

// 2) 並び順(空のフォルダも含めて、フォルダの一覧と並び順を残す)
const orderOf = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r.sort_order ?? 0]).sort(([a], [b]) => a.localeCompare(b)));
const folderPaths = new Map(folders.map((f) => [f.path, f.sort_order ?? 0]));
for (const d of documents) {
  const parts = d.id.split("/").slice(0, -1);
  for (let i = 1; i <= parts.length; i++) {
    const p = parts.slice(0, i).join("/");
    if (!folderPaths.has(p)) folderPaths.set(p, 0);
  }
}
const order = {
  folders: Object.fromEntries([...folderPaths].sort(([a], [b]) => a.localeCompare(b))),
  docs: orderOf(documents, "id"),
};
writeFileSync(join(root, ORDER_FILE), JSON.stringify(order, null, 2) + "\n");

// 3) 画像(docs/assets/)
const assetsDir = join(root, "assets");
const wantedAssets = new Set();
if (assets.length > 0) mkdirSync(assetsDir, { recursive: true });
for (const a of assets) {
  try {
    writeFileSync(join(assetsDir, a.name), Buffer.from(a.data, "base64"));
    wantedAssets.add(a.name);
  } catch (e) {
    problems.push(`画像 ${a.name}: ${e.message}`);
  }
}

// 4) D1 にないファイルを、消す(--prune のとき)か、知らせる
let removed = 0;
const extra = [];
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (dir === root && e.name === "assets") continue;
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".md")) out.push(full);
  }
  return out;
};
for (const f of walk(root)) {
  if (!wanted.has(posix(f.slice(root.length + 1)))) {
    if (pruneFiles) {
      unlinkSync(f);
      removed++;
    } else extra.push(posix(f.slice(root.length + 1)));
  }
}
if (existsSync(assetsDir)) {
  for (const name of readdirSync(assetsDir)) {
    if (!wantedAssets.has(name) && statSync(join(assetsDir, name)).isFile()) {
      if (pruneFiles) {
        unlinkSync(join(assetsDir, name));
        removed++;
      } else extra.push(`assets/${name}`);
    }
  }
  if (readdirSync(assetsDir).length === 0) rmSync(assetsDir, { recursive: true });
}
// 空になったフォルダ(D1 にもないもの)を消す。D1 にある空フォルダは、_order.json に残る
const prune = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !(dir === root && e.name === "assets")) prune(join(dir, e.name));
  }
  if (dir !== root && readdirSync(dir).length === 0) rmdirSync(dir);
};
if (pruneFiles) prune(root);

console.log(
  `${target.label}の D1 を ${root} に書き出しました(ドキュメント ${written} 件、画像 ${wantedAssets.size} 件、削除したファイル ${removed} 件)`,
);
if (extra.length > 0) {
  console.warn(`D1 にないファイルが ${extra.length} 件あります(消さずに残しました。D1 に合わせて消すときは --prune):`);
  for (const f of extra) console.warn(`  ${f}`);
}
for (const p of problems) console.warn(`書き出せませんでした: ${p}`);
if (problems.length > 0) process.exit(1);
