.PHONY: dev build deploy migrate migrate-local import-docs import-docs-local reset-password reset-password-local

# 開発(API は :8787、画面は :5173 で、画面から /api を API に転送する)
dev:
	npm run dev

build:
	npm run build

# 本番へのデプロイ(画面をビルドして、Worker と一緒に公開する)
deploy: build
	npm run deploy -w @f-docbase/api

# D1 のテーブル作成(migrations/ のうち未適用のもの)
migrate:
	cd apps/api && npx wrangler d1 migrations apply f-docbase --remote

migrate-local:
	cd apps/api && npx wrangler d1 migrations apply f-docbase --local

# docs/(Markdown と画像)を D1 に取り込む。同じ id は上書きする
import-docs:
	node apps/api/scripts/import-docs.mjs

import-docs-local:
	node apps/api/scripts/import-docs.mjs --local

# パスワードの再設定。
#   make reset-password USER_NAME=<ユーザー名>
# パスワードは実行後に対話入力する(画面にもシェルの履歴にも残らない)。
# PASSWORD=<パスワード> を付けると、対話入力を省略できる。
# reset-password は本番の D1、reset-password-local はローカルの D1。
reset-password:
	@test -n "$(USER_NAME)" || { echo "使い方: make reset-password USER_NAME=<ユーザー名>"; exit 1; }
	@node apps/api/scripts/reset-password.mjs "$(USER_NAME)" $(if $(PASSWORD),"$(PASSWORD)")

reset-password-local:
	@test -n "$(USER_NAME)" || { echo "使い方: make reset-password-local USER_NAME=<ユーザー名>"; exit 1; }
	@node apps/api/scripts/reset-password.mjs "$(USER_NAME)" $(if $(PASSWORD),"$(PASSWORD)") --local
