// パスワードを忘れたときの再設定用スクリプト(サーバーのあるマシンで実行する)。
// 使い方: node scripts/reset-password.mjs <ユーザー名> [新しいパスワード]
// パスワードを省略すると、入力を求められる(画面には表示されない)。
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { randomBytes, scryptSync } from "node:crypto";

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** 入力を画面に表示せずに1行読む。 */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (s) => {
      if (!muted) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

const [username, passwordArg] = process.argv.slice(2);
if (!username) fail("使い方: node scripts/reset-password.mjs <ユーザー名> [新しいパスワード]");

const file = path.resolve(process.env.USERS_FILE ?? "data/users.json");
if (!fs.existsSync(file)) fail(`${file} が見つかりません。先にログイン画面で初期設定を行ってください。`);
const users = JSON.parse(fs.readFileSync(file, "utf8"));
const user = users.find((u) => u.username === username);
if (!user) fail(`ユーザー「${username}」が見つかりません。登録済み: ${users.map((u) => u.username).join(", ")}`);

let password = passwordArg;
if (!password) {
  if (!process.stdin.isTTY) fail("パスワードを引数で指定してください(対話入力はターミナルでのみ使えます)。");
  password = await askHidden("新しいパスワード(8文字以上): ");
  if (password !== (await askHidden("もう一度入力: "))) fail("パスワードが一致しません。");
}
if (password.length < 8) fail("パスワードは8文字以上にしてください。");

// src/lib/users.ts と同じ形式(scrypt、salt:key の16進)
const salt = randomBytes(16);
user.passwordHash = `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
fs.writeFileSync(file, JSON.stringify(users, null, 2));
console.log(`${username} のパスワードを再設定しました。`);
