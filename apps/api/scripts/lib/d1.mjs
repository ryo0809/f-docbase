// wrangler d1 execute を呼ぶ共通処理。引数は配列で渡すので、シェルを介さない。
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const wranglerBin = join(dirname(require.resolve("wrangler/package.json")), "bin", "wrangler.js");

export const DATABASE = "f-docbase";

/** 対象の D1。既定は本番(リモート)で、--local を付けるとローカル(wrangler dev 用)。 */
export function targetFromArgs(args) {
  const local = args.includes("--local");
  return { local, flag: local ? "--local" : "--remote", label: local ? "ローカル" : "本番(リモート)" };
}

export function d1Execute(target, extra) {
  const res = spawnSync(process.execPath, [wranglerBin, "d1", "execute", DATABASE, target.flag, ...extra], {
    cwd: apiDir,
    stdio: "inherit",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

export function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
