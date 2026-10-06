// API と画面の間でやり取りするデータの形。

import type { Role } from "./roles";

export type DocMeta = {
  id: string; // フォルダ込みのパス(拡張子なし、/ 区切り)。例: 要件定義書/ECパッケージ
  title: string;
  tags: string[];
  updated: string; // ISO 8601
  /** 同じフォルダの中での並び順(1 以上が設定済み、0 は未設定) */
  order: number;
};

export type Doc = DocMeta & { content: string };

export type FolderInfo = {
  path: string;
  docCount: number;
  /** 同じフォルダの中での並び順(1 以上が設定済み、0 は未設定) */
  order: number;
};

export type TemplateInfo = { id: string; title: string; content: string };

export type UserInfo = { username: string; role: Role };

export type UserDetail = UserInfo & { createdAt: string };

/** GET /api/auth/status の応答。 */
export type AuthStatus = { setupRequired: boolean; user: UserInfo | null };
