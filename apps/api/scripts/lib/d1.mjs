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

/**
 * SELECT を実行して、結果の行を返す(読み取り用)。失敗したときは例外を投げる。
 * 画面入力を待たない(認証が切れているときも、待たずに失敗する)。
 */
export function d1Query(target, sql, { timeoutMs = 90_000 } = {}) {
  const res = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", DATABASE, target.flag, "--json", "--command", sql],
    { cwd: apiDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, maxBuffer: 512 * 1024 * 1024 },
  );
  if (res.error) throw new Error(`${target.label}の D1 に問い合わせできませんでした: ${res.error.message}`);
  const out = res.stdout ?? "";
  if (res.status !== 0) {
    const tail = `${res.stderr ?? ""}${out}`.trim().split("\n").slice(-6).join("\n");
    throw new Error(`${target.label}の D1 に問い合わせできませんでした\n${tail}`);
  }
  const start = out.indexOf("[");
  try {
    return JSON.parse(out.slice(start))[0]?.results ?? [];
  } catch {
    throw new Error(`${target.label}の D1 の応答を読めませんでした`);
  }
}

/** SQL ファイルを実行する。失敗しても終了せず、結果を返す(呼び出し側で扱う)。 */
export function d1RunFile(target, file, { timeoutMs = 120_000 } = {}) {
  const res = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", DATABASE, target.flag, "--file", file],
    { cwd: apiDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 },
  );
  const output = `${res.stderr ?? ""}${res.stdout ?? ""}`;
  return { ok: !res.error && res.status === 0, output };
}

export const LOCAL = { local: true, flag: "--local", label: "ローカル" };
export const REMOTE = { local: false, flag: "--remote", label: "本番(リモート)" };
