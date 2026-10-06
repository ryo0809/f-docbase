// 本番(リモート)の D1 のドキュメント・フォルダ・画像・並び順を、ローカルの D1 に写す。
//   npm run sync-docs
// 本番 → ローカルの一方向。ローカルのドキュメントは、本番の内容で置き換わる(ローカルで編集した内容は失われる)。
// 本番には書き込まない(読み取りだけ)。ユーザー情報は対象外。
// 先に `npm run migrate:local` でローカルのテーブルを作っておく(npm run dev は自動で実行する)。
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOCAL, REMOTE, d1Query, d1RunFile, sqlString } from "./lib/d1.mjs";

const insert = (table, row) => {
  const cols = Object.keys(row);
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => (typeof row[c] === "number" ? row[c] : sqlString(row[c]))).join(", ")});`;
};

try {
  // 本番を読む。SELECT * なので、本番にまだない列(並び順など)は、ローカルの既定値になる
  const documents = d1Query(REMOTE, "SELECT * FROM documents");
  const folders = d1Query(REMOTE, "SELECT * FROM folders");
  const assets = d1Query(REMOTE, "SELECT * FROM assets");

  const statements = ["DELETE FROM documents;", "DELETE FROM folders;", "DELETE FROM assets;"];
  for (const r of documents) statements.push(insert("documents", r));
  for (const r of folders) statements.push(insert("folders", r));
  for (const r of assets) statements.push(insert("assets", r));

  const tmp = mkdtempSync(join(tmpdir(), "docbase-sync-"));
  try {
    const file = join(tmp, "sync.sql");
    writeFileSync(file, statements.join("\n") + "\n");
    const res = d1RunFile(LOCAL, file);
    if (!res.ok) {
      const tail = res.output.trim().split("\n").slice(-6).join("\n");
      throw new Error(`ローカルの D1 に書き込めませんでした(先に npm run migrate:local を実行してください)\n${tail}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`本番のドキュメントを、ローカルに同期しました(ドキュメント ${documents.length} 件、フォルダ ${folders.length} 件、画像 ${assets.length} 件)`);
} catch (e) {
  console.error(`ドキュメントの同期に失敗しました: ${e.message}`);
  process.exit(1);
}
