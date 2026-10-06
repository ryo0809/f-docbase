// 開発サーバーを起動する。
//   npm run dev                  ローカルの D1 を最新にして、本番のドキュメントを同期してから、API と画面を起動する
//   npm run dev -- --no-sync     同期せずに起動する(オフラインのときなど)
// 1. ローカルの D1 に、未適用のマイグレーションを適用する
// 2. 本番のドキュメントを、ローカルの D1 に同期する(本番に接続できないときは、警告を出して、そのまま起動する)
// 3. API(wrangler dev)を起動し、応答するようになってから、画面(Vite)を起動する
//    (画面が先に起動すると、API への転送が失敗して、起動直後にエラーが出るため)
// どちらかが止まったら、もう一方も止める。
import { spawn, spawnSync } from "node:child_process";

const noSync = process.argv.includes("--no-sync");
const API_URL = "http://127.0.0.1:8787/api/auth/status";

/** npm run <script> を、終わるまで実行する。成功したら true。 */
function runNpm(args, label) {
  console.log(`[dev] ${label}`);
  const res = spawnSync("npm", args, { stdio: "inherit", shell: true });
  return res.status === 0;
}

if (!runNpm(["run", "migrate:local", "-w", "@f-docbase/api"], "ローカルの D1 のマイグレーションを適用します")) {
  console.error("[dev] マイグレーションに失敗しました");
  process.exit(1);
}

if (noSync) {
  console.log("[dev] --no-sync のため、ドキュメントの同期は行いません");
} else {
  console.log("[dev] 本番のドキュメントを、ローカルに同期します(ローカルで編集したドキュメントは、本番の内容に置き換わります)");
  const ok = spawnSync(process.execPath, ["apps/api/scripts/sync-docs.mjs"], { stdio: "inherit" }).status === 0;
  if (!ok) console.warn("[dev] 同期できなかったため、ローカルの D1 の内容のまま起動します(npm run sync-docs で、やり直せます)");
}

const children = [];
let stopping = false;

function start(name, args) {
  const child = spawn("npm", args, { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    console.log(`[${name}] 終了しました (code ${code})`);
    stop();
  });
  children.push(child);
  return child;
}

function stop() {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"]);
    else c.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

/** API が応答するまで待つ(最長 90 秒)。 */
async function waitForApi() {
  for (let i = 0; i < 180 && !stopping; i++) {
    try {
      await fetch(API_URL);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

start("api", ["run", "dev", "-w", "@f-docbase/api"]);
if (await waitForApi()) start("web", ["run", "dev", "-w", "@f-docbase/web"]);
else if (!stopping) {
  console.error("[dev] API が起動しなかったため、画面を起動しません");
  stop();
}
