// ローカルの D1 に、ロール別の開発用アカウントを作る。
//   npm run seed:local
// ローカル専用。本番(リモート)の D1 を対象にする指定はできない。
// すでにいるユーザーは変更しない(何度実行しても安全)。
// 先に `npm run migrate:local` でテーブルを作っておく。
import { randomBytes, pbkdf2 } from "node:crypto";
import { promisify } from "node:util";
import { d1Execute, sqlString } from "./lib/d1.mjs";

if (process.argv.slice(2).length > 0) {
  console.error("引数は受け付けません。このコマンドは、ローカルの D1 にだけ作ります(npm run seed:local)");
  process.exit(1);
}

const target = { flag: "--local", label: "ローカル" };

// 本番のパスワードとは無関係な、公開してよい固定値(README にも書いてある)
const PASSWORD = "password-1";
const ITERATIONS = 40_000; // API の Pbkdf2PasswordHasher と同じ
const ACCOUNTS = [
  ["dev-owner", "owner"],
  ["dev-developer", "developer"],
  ["dev-viewer", "viewer"],
];

async function hash(password) {
  const salt = randomBytes(16);
  const key = await promisify(pbkdf2)(password, salt, ITERATIONS, 32, "sha256");
  return `pbkdf2$sha256$${ITERATIONS}$${salt.toString("hex")}$${key.toString("hex")}`;
}

const now = new Date().toISOString();
const statements = [];
for (const [username, role] of ACCOUNTS) {
  statements.push(
    `INSERT OR IGNORE INTO users (username, role, password_hash, created_at) VALUES (${sqlString(username)}, ${sqlString(role)}, ${sqlString(await hash(PASSWORD))}, ${sqlString(now)});`,
  );
}
statements.push("SELECT username, role FROM users ORDER BY created_at, username;");

console.log(`対象: ${target.label} の D1 / 開発用アカウント ${ACCOUNTS.length} 件(パスワードは README を参照)`);
d1Execute(target, ["--command", statements.join(" ")]);
