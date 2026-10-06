import { ValidationError } from "../shared/errors";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** D1 の1行の上限(2MB)に収まるように抑える */
export const MAX_ASSET_BYTES = 1024 * 1024;

export class Asset {
  private constructor(
    readonly name: string,
    readonly contentType: string,
    readonly data: Uint8Array,
    readonly createdAt: Date,
  ) {}

  /** アップロードされた画像から作る。名前は uniqueId から決める。拡張子で種類を判定する。 */
  static upload(filename: string, data: Uint8Array, uniqueId: string, now: Date): Asset {
    const ext = (/\.([A-Za-z0-9]+)$/.exec(filename)?.[1] ?? "png").toLowerCase();
    const contentType = TYPES[ext];
    if (!contentType) throw new ValidationError("対応していない画像形式です(png / jpg / gif / webp / svg)");
    if (data.byteLength === 0) throw new ValidationError("ファイルが空です");
    if (data.byteLength > MAX_ASSET_BYTES) throw new ValidationError("画像は1MBまでです");
    return new Asset(`${uniqueId}.${ext}`, contentType, data, now);
  }

  static restore(name: string, contentType: string, data: Uint8Array, createdAt: Date): Asset {
    return new Asset(name, contentType, data, createdAt);
  }
}
