import { SESSION_MAX_AGE_SECONDS } from "../../application/auth/session-policy";
import type { Clock, SessionTokenService } from "../../application/ports/ports";

/** 署名キーの取得元 */
export interface SecretProvider {
  get(): Promise<string>;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** `<payload>.<署名>` 形式のトークン。payload はユーザー名と有効期限、署名は HMAC-SHA256。 */
export class HmacSessionTokenService implements SessionTokenService {
  constructor(
    private readonly secret: SecretProvider,
    private readonly clock: Clock,
  ) {}

  private async key(usage: "sign" | "verify"): Promise<CryptoKey> {
    return crypto.subtle.importKey("raw", enc.encode(await this.secret.get()), { name: "HMAC", hash: "SHA-256" }, false, [
      usage,
    ]);
  }

  async issue(username: string): Promise<string> {
    const exp = this.clock.now().getTime() + SESSION_MAX_AGE_SECONDS * 1000;
    const payload = toB64Url(enc.encode(JSON.stringify({ u: username, exp })));
    const sig = await crypto.subtle.sign("HMAC", await this.key("sign"), enc.encode(payload));
    return `${payload}.${toB64Url(new Uint8Array(sig))}`;
  }

  async verify(token: string | undefined): Promise<string | null> {
    if (!token) return null;
    const [payload, sig, ...rest] = token.split(".");
    if (!payload || !sig || rest.length > 0) return null;
    try {
      const ok = await crypto.subtle.verify("HMAC", await this.key("verify"), fromB64Url(sig) as BufferSource, enc.encode(payload));
      if (!ok) return null;
      const { u, exp } = JSON.parse(dec.decode(fromB64Url(payload)));
      return typeof u === "string" && typeof exp === "number" && exp > this.clock.now().getTime() ? u : null;
    } catch {
      return null;
    }
  }
}
