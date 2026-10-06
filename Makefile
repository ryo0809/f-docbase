.PHONY: reset-password

# パスワードの再設定。
#   make reset-password USER_NAME=<ユーザー名>
# パスワードは実行後に対話入力する(画面にもシェルの履歴にも残らない)。
# PASSWORD=<パスワード> を付けると、対話入力を省略できる。
reset-password:
	@test -n "$(USER_NAME)" || { echo "使い方: make reset-password USER_NAME=<ユーザー名>"; exit 1; }
	@node scripts/reset-password.mjs "$(USER_NAME)" $(if $(PASSWORD),"$(PASSWORD)")
