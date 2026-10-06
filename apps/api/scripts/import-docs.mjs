// リポジトリの docs/(Markdown と画像)を D1 に取り込む。
//   node scripts/import-docs.mjs [--local] [--dir <docsのパス>]
// 既定は本番(リモート)の D1。--local でローカルの D1(wrangler dev 用)。
// 同じ id のドキュメントがあれば、本文・タイトル・タグ・更新日時を上書きする(並び順は変えない)。D1 にしかないドキュメントは消さない。
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { d1Execute, sqlString, targetFromArgs } from "./lib/d1.mjs";

const args = process.argv.slice(2);
const target = targetFromArgs(args);
const dirFlag = args.indexOf("--dir");
const root = resolve(
  dirFlag >= 0 ? args[dirFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs"),
);

const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function walk(dir, files = [], dirs = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (dir === root && e.name === "assets") continue;
    if (e.isDirectory()) {
      dirs.push(full);
      walk(full, files, dirs);
    } else if (e.name.endsWith(".md")) files.push(full);
  }
  return { files, dirs };
}

const posix = (p) => p.split(sep).join("/");
const { files, dirs } = walk(root);
const statements = [];

for (const file of files) {
  const id = posix(relative(root, file)).replace(/\.md$/, "");
  const { data, content } = matter(readFileSync(file, "utf8"));
  const title = typeof data.title === "string" && data.title ? data.title : basename(id);
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const updated =
    data.updated instanceof Date ? data.updated.toISOString() : typeof data.updated === "string" ? data.updated : statSync(file).mtime.toISOString();
  statements.push(
    // 行を作り直さず、本文などだけを更新する(管理画面で設定した並び順を残すため)
    `INSERT INTO documents (id, title, tags, content, updated_at) VALUES (${sqlString(id)}, ${sqlString(title)}, ${sqlString(JSON.stringify(tags))}, ${sqlString(content)}, ${sqlString(updated)}) ` +
      `ON CONFLICT(id) DO UPDATE SET title = excluded.title, tags = excluded.tags, content = excluded.content, updated_at = excluded.updated_at;`,
  );
}

// 空のフォルダも含めて、フォルダを保存する(ドキュメントの親フォルダも残る)
for (const d of dirs) {
  statements.push(`INSERT OR IGNORE INTO folders (path) VALUES (${sqlString(posix(relative(root, d)))});`);
}

// 画像は、元のファイル名のまま取り込む(本文の /api/assets/<名前> がそのまま使える)
let assetCount = 0;
const assetsDir = join(root, "assets");
try {
  for (const name of readdirSync(assetsDir)) {
    const type = IMAGE_TYPES[extname(name).toLowerCase()];
    if (!type) continue;
    const data = readFileSync(join(assetsDir, name));
    if (data.length > 1024 * 1024) {
      console.warn(`スキップ(1MB超): ${name}`);
      continue;
    }
    statements.push(
      `INSERT OR REPLACE INTO assets (name, content_type, data, created_at) VALUES (${sqlString(name)}, ${sqlString(type)}, ${sqlString(data.toString("base64"))}, ${sqlString(statSync(join(assetsDir, name)).mtime.toISOString())});`,
    );
    assetCount++;
  }
} catch {
  // assets/ が無ければ画像はなし
}

if (statements.length === 0) {
  console.log(`${root} に取り込むものがありません`);
  process.exit(0);
}

console.log(`対象: ${target.label} の D1 / ドキュメント ${files.length} 件、フォルダ ${dirs.length} 件、画像 ${assetCount} 件`);
const tmp = mkdtempSync(join(tmpdir(), "docbase-import-"));
const sqlFile = join(tmp, "import.sql");
try {
  writeFileSync(sqlFile, statements.join("\n") + "\n");
  d1Execute(target, ["--file", sqlFile]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
