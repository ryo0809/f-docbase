import { Asset } from "../../domain/asset/asset";
import type { AssetRepository } from "../../domain/asset/asset-repository";

type Row = { name: string; content_type: string; data: string; created_at: string };

const CHUNK = 0x8000;

// 新しい実行環境にある、ネイティブの base64 変換(速い)。無ければ手作業で変換する
type Base64Api = { toBase64?: () => string };
type Base64Static = { fromBase64?: (text: string) => Uint8Array };

function toBase64(bytes: Uint8Array): string {
  const native = (bytes as Base64Api).toBase64;
  if (native) return native.call(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

function fromBase64(text: string): Uint8Array {
  const native = (Uint8Array as unknown as Base64Static).fromBase64;
  if (native) return native.call(Uint8Array, text);
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * 画像は base64 の文字列として D1 に保存する。
 * D1 の BLOB は、読み出すと1バイトごとの数値の配列になり、CPU 時間がかかるため。
 */
export class D1AssetRepository implements AssetRepository {
  constructor(private readonly db: D1Database) {}

  async add(asset: Asset): Promise<void> {
    await this.db
      .prepare("INSERT INTO assets (name, content_type, data, created_at) VALUES (?, ?, ?, ?)")
      .bind(asset.name, asset.contentType, toBase64(asset.data), asset.createdAt.toISOString())
      .run();
  }

  async find(name: string): Promise<Asset | null> {
    const row = await this.db
      .prepare("SELECT name, content_type, data, created_at FROM assets WHERE name = ?")
      .bind(name)
      .first<Row>();
    return row ? Asset.restore(row.name, row.content_type, fromBase64(row.data), new Date(row.created_at)) : null;
  }
}
