-- 並び順。同じフォルダの中のフォルダ同士・ドキュメント同士で比べる。
-- 1 以上が設定済み、0 は未設定(設定済みより後ろに、名前順で並ぶ)
ALTER TABLE documents ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
