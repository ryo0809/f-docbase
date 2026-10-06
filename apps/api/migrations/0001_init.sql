-- ユーザー
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('owner', 'developer', 'viewer')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ドキュメント。id はフォルダ込みのパス(拡張子なし)
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 明示的に作ったフォルダ(空フォルダ用)。ドキュメントの親フォルダは documents.id から導く
CREATE TABLE folders (
  path TEXT PRIMARY KEY
);

-- アップロード画像。data は base64 の文字列(BLOB は読み出しに CPU 時間がかかるため)
CREATE TABLE assets (
  name TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 設定(セッションの署名キーなど)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
