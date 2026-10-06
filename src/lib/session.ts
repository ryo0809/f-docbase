// セッショントークンの署名・検証。proxy(Node.js ランタイム)からも使う。
import fs from "node:fs/promises";
import path from "node:path";

export const SESSION_COOKIE = "docbase_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7日(秒)

const SECRET_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.SESSION_SECRET_FILE ?? "data/session-secret");

let cached: Promise<string> | undefined;

/** 署名キー。環境変数 SESSION_SECRET があればそれを使い、無ければ初回に自動生成してファイルに保存する。 */
function secret(): Promise<string> {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return Promise.resolve(fromEnv);
  cached ??= loadOrCreateSecret().catch((e) => {
    cached = undefined;
    throw e;
  });
  return cached;
}

async function loadOrCreateSecret(): Promise<string> {
  try {
    return (await fs.readFile(SECRET_FILE, "utf8")).trim();
  } catch {
    // 無ければ作る。同時に作られた場合は先に書かれた方を採用する
  }
  await fs.mkdir(path.dirname(SECRET_FILE), { recursive: true });
  const generated = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
  try {
    await fs.writeFile(SECRET_FILE, generated, { flag: "wx" });
    return generated;
  } catch {
    return (await fs.readFile(SECRET_FILE, "utf8")).trim();
  }
}

const enc = new TextEncoder();

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function hmacKey(usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", enc.encode(await secret()),{ name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

/** ユーザー名と有効期限を署名したトークンを作る。 */
export async function signSession(username: string): Promise<string> {
  const payload = toB64Url(enc.encode(JSON.stringify({ u: username, exp: Date.now() + SESSION_MAX_AGE * 1000 })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey("sign"), enc.encode(payload));
  return `${payload}.${toB64Url(new Uint8Array(sig))}`;
}

/** 署名と有効期限を検証し、ユーザー名を返す。不正・期限切れなら null。 */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [payload, sig, ...rest] = token.split(".");
  if (!payload || !sig || rest.length > 0) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey("verify"),
      fromB64Url(sig) as BufferSource,
      enc.encode(payload),
    );
    if (!ok) return null;
    const { u, exp } = JSON.parse(new TextDecoder().decode(fromB64Url(payload)));
    return typeof u === "string" && typeof exp === "number" && exp > Date.now() ? u : null;
  } catch {
    return null;
  }
}
