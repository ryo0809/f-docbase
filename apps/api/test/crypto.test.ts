import { describe, expect, it } from "vitest";
import { HmacSessionTokenService } from "../src/infrastructure/crypto/hmac-session-token-service";
import { Pbkdf2PasswordHasher } from "../src/infrastructure/crypto/pbkdf2-password-hasher";
import { FakeClock } from "./support/in-memory";

describe("Pbkdf2PasswordHasher", () => {
  const hasher = new Pbkdf2PasswordHasher(1000);

  it("ハッシュを検証できる(同じパスワードでも毎回別のハッシュ)", async () => {
    const a = await hasher.hash("correct horse");
    expect(a).toMatch(/^pbkdf2\$sha256\$1000\$[0-9a-f]+\$[0-9a-f]+$/);
    expect(await hasher.hash("correct horse")).not.toBe(a);
    expect(await hasher.verify("correct horse", a)).toBe(true);
    expect(await hasher.verify("wrong", a)).toBe(false);
  });

  it("保存値がない・壊れている場合は false", async () => {
    expect(await hasher.verify("x", null)).toBe(false);
    expect(await hasher.verify("x", "garbage")).toBe(false);
    expect(await hasher.verify("x", "pbkdf2$sha256$1000$zz$zz")).toBe(false);
  });

  it("保存された反復回数で検証する(設定を変えても古いハッシュは使える)", async () => {
    const old = await new Pbkdf2PasswordHasher(500).hash("pw-12345");
    expect(await hasher.verify("pw-12345", old)).toBe(true);
  });
});

describe("HmacSessionTokenService", () => {
  const clock = new FakeClock();
  const service = new HmacSessionTokenService({ get: async () => "secret-secret-secret" }, clock);

  it("発行したトークンからユーザー名を取り出せる", async () => {
    expect(await service.verify(await service.issue("alice"))).toBe("alice");
  });

  it("改ざん・別の署名キー・期限切れ・不正な形式は null", async () => {
    const token = await service.issue("alice");
    const [payload, sig] = token.split(".") as [string, string];
    const forged = `${btoa(JSON.stringify({ u: "bob", exp: Date.now() + 1e9 })).replace(/=+$/, "")}.${sig}`;
    expect(await service.verify(forged)).toBeNull();
    expect(await service.verify(`${payload}.${sig.slice(0, -2)}AA`)).toBeNull();
    expect(await new HmacSessionTokenService({ get: async () => "other-secret-xxxxxx" }, clock).verify(token)).toBeNull();
    expect(await service.verify("abc")).toBeNull();
    expect(await service.verify(undefined)).toBeNull();
    clock.advance(8 * 24 * 60 * 60 * 1000);
    expect(await service.verify(token)).toBeNull();
  });
});
