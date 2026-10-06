// ユーザーのパスワードを再設定する(オーナーがパスワードを忘れたときなど)。
//   node scripts/reset-password.mjs <ユーザー名> [パスワード] [--local]
// パスワードを省略すると、画面に表示されない入力で聞く(端末のときだけ)。
// 既定は本番(リモート)の D1。--local でローカルの D1(wrangler dev 用)。
import { randomBytes, pbkdf2 } from "node:crypto";
import { promisify } from "node:util";
import { d1Execute, sqlString, targetFromArgs } from "./lib/d1.mjs";

const args = process.argv.slice(2);
const target = targetFromArgs(args);
const [username, passwordArg] = args.filter((a) => !a.startsWith("--"));

const ITERATIONS = 40_000; // API の Pbkdf2PasswordHasher と同じ
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

if (!username || !USERNAME_RE.test(username)) {
  console.error("使い方: npm run reset-password -- <ユーザー名> [パスワード]  (ローカルの D1 は reset-password:local)");
  process.exit(1);
}

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("パスワードを引数で渡すか、端末から実行してください"));
    process.stdout.write(question);
    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(input);
        }
        if (c === "\u0003") process.exit(130); // Ctrl+C
        if (c === "\u007f" || c === "\b") input = input.slice(0, -1);
        else input += c;
      }
    };
    process.stdin.on("data", onData);
  });
}

let password = passwordArg;
if (password === undefined) {
  password = await promptHidden("新しいパスワード(8文字以上): ");
  if (password !== (await promptHidden("もう一度入力: "))) {
    console.error("パスワードが一致しません");
    process.exit(1);
  }
}
if (password.length < 8 || password.length > 128) {
  console.error("パスワードは8〜128文字で入力してください");
  process.exit(1);
}

const salt = randomBytes(16);
const key = await promisify(pbkdf2)(password, salt, ITERATIONS, 32, "sha256");
const hash = `pbkdf2$sha256$${ITERATIONS}$${salt.toString("hex")}$${key.toString("hex")}`;

console.log(`対象: ${target.label} の D1 / ユーザー: ${username}`);
// 該当ユーザーがいないときは、何も更新せずに終わる(件数を表示する)
d1Execute(target, [
  "--command",
  `UPDATE users SET password_hash = ${sqlString(hash)} WHERE username = ${sqlString(username)}; SELECT changes() AS updated_rows;`,
]);
console.log("updated_rows が 1 なら、パスワードを変更しました(0 ならユーザー名が違います)。");
