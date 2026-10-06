import type { PasswordHasher } from "../../domain/user/password-hasher";

// 無料プランの CPU 時間(1リクエスト 10ms)に収めるため、推奨値(60万回以上)より大幅に少ない。
// 本番での実測は 10万回で約 24ms。その分、パスワードは長く推測されにくいものにしてもらう。
// 保存する文字列に反復回数を含めるので、あとから変えても、既存のハッシュは検証できる。
// (Workers の Web Crypto は 10万回までに制限している)
const DEFAULT_ITERATIONS = 40_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;
const PREFIX = "pbkdf2$sha256$";

const enc = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** PBKDF2-SHA256。保存形式は `pbkdf2$sha256$<反復回数>$<salt(hex)>$<key(hex)>`。 */
export class Pbkdf2PasswordHasher implements PasswordHasher {
  constructor(private readonly iterations = DEFAULT_ITERATIONS) {}

  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const key = await derive(password, salt, this.iterations);
    return `${PREFIX}${this.iterations}$${toHex(salt)}$${toHex(key)}`;
  }

  async verify(password: string, stored: string | null): Promise<boolean> {
    const parsed = stored?.startsWith(PREFIX) ? stored.slice(PREFIX.length).split("$") : [];
    const iterations = Number(parsed[0]);
    const salt = parsed[1] ? fromHex(parsed[1]) : null;
    const expected = parsed[2] ? fromHex(parsed[2]) : null;
    if (!salt || !expected || !Number.isInteger(iterations) || iterations < 1) {
      // 保存値がない・壊れている場合も、同じ計算量を使ってから false を返す
      await derive(password, new Uint8Array(SALT_BYTES), this.iterations);
      return false;
    }
    return timingSafeEqual(expected, await derive(password, salt, iterations));
  }
}
