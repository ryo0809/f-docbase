import type { SecretProvider } from "../crypto/hmac-session-token-service";

const KEY = "session_secret";

/**
 * セッションの署名キー。D1 の settings に保存し、無ければ初回に自動生成する。
 * 環境変数やシークレットの設定は要らない。
 */
export class D1SessionSecret implements SecretProvider {
  private cached: Promise<string> | undefined;

  constructor(private readonly db: D1Database) {}

  get(): Promise<string> {
    this.cached ??= this.load().catch((e) => {
      this.cached = undefined;
      throw e;
    });
    return this.cached;
  }

  private async load(): Promise<string> {
    const read = () => this.db.prepare("SELECT value FROM settings WHERE key = ?").bind(KEY).first<string>("value");
    const existing = await read();
    if (existing) return existing;
    const generated = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
    // 同時に作られた場合は、先に保存された方を使う
    await this.db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(KEY, generated).run();
    return (await read()) ?? generated;
  }
}
