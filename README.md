# f-docbase

要件定義書・設計書などのドキュメントを、画面上で作成・編集・管理できる個人用ドキュメントWebアプリ。
成果物はすべてWeb上で確認できる。Cloudflare の無料プランで動かす(ランニングコスト 0 円が前提)。

## 要件

| 項目 | 内容 |
|---|---|
| 目的 | 要件定義書・設計書などを画面上で作成・編集・管理し、Web上で閲覧する |
| 利用者 | ログインしたユーザー(オーナー / 開発メンバー / 一般メンバー。「認証と権限」を参照) |
| 実行環境 | Cloudflare(Workers + D1)。ローカルでは wrangler と Vite で動かす |
| 編集 | Markdownを画面上で編集し、プレビューも表示する |
| 保存 | Cloudflare D1(SQLite)。ドキュメントは本文を Markdown のまま保存する |
| メタデータ | タイトル・タグ・更新日時をドキュメントごとに持つ |
| 履歴管理 | MVPでは不要 |

### 機能

- ドキュメントのCRUD(作成・閲覧・編集・削除・一覧)
- テンプレート(要件定義書・設計書の雛形から作成)
- フォルダ / タグによる整理
- Markdown表現: Mermaid図、画像のアップロード / 貼り付け、コードハイライト、目次の自動生成

### 対象外(将来検討)

- 全文検索
- 履歴管理 / 差分表示
- ログイン試行の回数制限

## 構成

無料プランの CPU 時間(1リクエスト 10ms)に収めるため、画面は静的ファイルとして配信し、API だけを Worker で処理する。
Next.js のサーバー描画は、何もしない API でも 100ms 以上の CPU 時間がかかったため採用しなかった。

| 領域 | 採用 |
|---|---|
| 画面 | Vite + React + React Router + Tailwind CSS。静的ファイルとして Workers の静的アセットで配信する(CPU 時間がかからない) |
| API | Hono(Cloudflare Workers)。`/api/*` だけを Worker が処理する |
| 保存 | Cloudflare D1 |
| 描画 | `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-slug` + `mermaid`(ブラウザ側) |
| 認証 | PBKDF2 でハッシュ化したパスワード + 署名付き Cookie |
| テスト | Vitest |

```
apps/
  api/                    Worker(API)。DDD + クリーンアーキテクチャ
    src/
      domain/             業務のルール(エンティティ・値オブジェクト・リポジトリの interface)。外部に依存しない
      application/        use case(「誰が何をできるか」の判断もここ)
      infrastructure/     D1・Web Crypto による実装
      interface/http/     Hono のルーティング、エラーの HTTP への変換
      container.ts        依存関係の組み立て(実装を選ぶのはここだけ)
    migrations/           D1 のテーブル定義
    scripts/              取り込み・パスワード再設定
    test/                 テスト(メモリ上の実装で、use case と HTTP を動かす)
  web/                    画面(SPA)
packages/
  shared/                 API と画面で共有するロール・権限・データの型
templates/                ドキュメントのテンプレート(.md)。API のビルド時に Worker へ同梱される
docs/                     ドキュメントの元データ(.md)。D1 への取り込み用(下記)
```

依存の向きは `interface → application → domain` で、`infrastructure` は `domain` の interface を実装する。
`domain` は Hono・D1・Web Crypto を知らない。

## 開発

```
npm install
make migrate-local     # ローカルの D1 にテーブルを作る(初回だけ)
make import-docs-local # docs/ をローカルの D1 に取り込む(任意)
npm run dev            # API: http://127.0.0.1:8787 / 画面: http://localhost:5173
npm test               # テスト
npm run typecheck      # 型チェック
```

画面(5173)は、`/api` を API(8787)に転送する。ローカルの D1 は `apps/api/.wrangler/` に保存される(Git 管理外)。

## 認証と権限

ログインしないと、画面も API も使えない。ユーザーのロールによって、できる操作が決まる。

| ロール | 閲覧 | 編集(作成・更新・移動・画像アップロード) | 削除(ドキュメント・フォルダ) | ユーザー管理 |
|---|---|---|---|---|
| オーナー | ○ | ○ | ○ | ○ |
| 開発メンバー | ○ | ○ | ✕ | ✕ |
| 一般メンバー | ○ | ✕ | ✕ | ✕ |

- 権限の確認は API(use case)で行う。画面側の表示制御は、使えない操作を見せないためのもの。
- ユーザーの作成、ロールの設定、パスワードの変更は、オーナーが管理ページ(`/admin`)の「ユーザー管理」タブで行う。
- 最後のオーナーの削除・降格と、自分自身の削除・ロール変更はできない。
- パスワードは PBKDF2-SHA256 でハッシュ化して保存する。無料プランの CPU 時間(10ms)に収めるため、反復回数は 4万回と少ない(推奨は 60万回以上)。長めのパスワードを使うこと。セッションは署名付き Cookie(7日間、HttpOnly)。ロールは毎回ユーザー情報から読むため、変更や削除はすぐ反映される。
- ユーザー情報とセッションの署名キーは D1 に保存される。署名キーは初回に自動生成されるので、環境変数やシークレットの設定は要らない。

### 初期設定

ユーザーが1人もいない間は、ログイン画面に「初期設定」のフォームが表示される。ここで最初のユーザー(オーナー)を作成すると、そのままログインできる。2人目以降は、オーナーが管理ページの「ユーザー管理」タブで追加する。

- **最初にアクセスした人がオーナーになる。** 初めて公開したら、すぐに自分で初期設定を済ませる。

### パスワードを忘れたとき

- オーナー以外のユーザー: オーナーが管理ページの「ユーザー管理」タブで、パスワードを変更する。
- オーナー自身: 次のコマンドを実行する(本番の D1 を更新する。`wrangler login` 済みであること)。

```
make reset-password USER_NAME=<ユーザー名>
```

  実行後にパスワードの入力を求められる(画面にもシェルの履歴にも残らない)。`make` が使えない環境では、`node apps/api/scripts/reset-password.mjs <ユーザー名>` でも同じ。ローカルの D1 には `make reset-password-local` を使う。

## デプロイ(Cloudflare)

無料プランで動く。初回は `wrangler login` でログインしておく。

```
make deploy            # 画面をビルドして、Worker と静的ファイルを公開する
make migrate           # 本番の D1 にテーブルを作る(新しい migration があるとき)
make import-docs       # docs/ を本番の D1 に取り込む(任意)
```

- D1 は、初回の `deploy` で自動作成される。作成後の `database_id` は `wrangler.jsonc` に書いてある(秘密ではない)。
- 公開 URL は `https://f-docbase.<アカウントのサブドメイン>.workers.dev`。
- 無料プランの上限: Workers は 1日10万リクエスト・1リクエスト CPU 10ms、D1 は 1日 読み取り500万行・書き込み10万行・容量5GB。
- 画像は D1 に base64 で保存する(1枚 1MB まで)。

### 自動デプロイ(GitHub Actions)

`main` にマージ(push)されると、[.github/workflows/deploy.yml](.github/workflows/deploy.yml) が次を順に実行する。どれかが失敗したら、デプロイしない。

1. 型チェック、テスト
2. 画面のビルド
3. D1 のマイグレーション(未適用のものだけ)
4. Worker と静的ファイルのデプロイ

Actions タブの「Deploy」から、手動でも実行できる。

初回だけ、次の設定が要る。

1. Cloudflare のダッシュボード「My Profile > API Tokens > Create Token」で、トークンを作る。権限は **Account > Workers Scripts > Edit**、**Account > D1 > Edit**、**Account > Account Settings > Read**。アカウントはこのアカウントだけに絞る。
2. GitHub のリポジトリの「Settings > Secrets and variables > Actions > New repository secret」に、次の2つを登録する。
   - `CLOUDFLARE_API_TOKEN`: 作ったトークン
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare のアカウント ID(ダッシュボードの URL `dash.cloudflare.com/<ここ>/` の部分)

トークンは Cloudflare の権限そのものなので、リポジトリにも会話にも書かないこと。

## 設計上の注意

- ドキュメントの id は、フォルダ込みのパス(拡張子なし)。`..` や空の要素、`assets` で始まるパスは拒否する。
- ドキュメントを作ったフォルダは、中身が空になっても残る(フォルダの削除は管理ページで行う)。
- バックアップ: D1 の内容は `wrangler d1 export f-docbase --remote --output backup.sql` で書き出せる。

## ステータス

プロトタイプ作成中。
