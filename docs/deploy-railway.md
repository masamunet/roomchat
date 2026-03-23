# Railway デプロイガイド

RoomChat を Railway にデプロイする手順です。

## 前提条件

- GitHub リポジトリに push 済みであること
- [Railway](https://railway.app/) のアカウントがあること
- Google OAuth の Client ID / Client Secret を取得済みであること

## デプロイ手順

### 1. プロジェクトの作成

1. Railway ダッシュボードで **New Project** を選択
2. **Deploy from GitHub repo** を選択し、`masamunet/roomchat` を接続
3. リポジトリ内の `railway.json` が自動検出され、ビルド・起動コマンドが設定される

### 2. PostgreSQL の追加

1. プロジェクト内で **New** > **Database** > **Add PostgreSQL** を選択
2. データベースが作成される
3. Web Service の **Variables** タブで `DATABASE_URL` を追加:
   - 値: `${{Postgres.DATABASE_URL}}`（Railway の変数参照で自動解決される）

### 3. 環境変数の設定

Web Service の **Variables** タブで以下を設定してください。

| 環境変数 | 説明 | 例 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 接続文字列 | `${{Postgres.DATABASE_URL}}` |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | `GOCSPX-xxxx` |
| `ORIGIN` | アプリの公開 URL | `https://roomchat-production.up.railway.app` |
| `NODE_ENV` | 環境 | `production` |
| `COOKIE_SECRET` | Cookie 署名用シークレット | 任意のランダム文字列 |
| `DB_SSL_MODE` | SSL モード（Railway 内部 DB は不要） | `disable` |

### 4. ドメインの設定

1. Web Service の **Settings** > **Networking** > **Generate Domain** をクリック
2. 生成された URL（例: `https://roomchat-production.up.railway.app`）を `ORIGIN` 環境変数に設定
3. カスタムドメインを使用する場合は **Custom Domain** から設定

### 5. Google OAuth のリダイレクト URI 設定

[Google Cloud Console](https://console.cloud.google.com/) で、OAuth 2.0 クライアントの「承認済みのリダイレクト URI」に以下を追加してください:

```
https://<your-railway-domain>/auth/google/callback
```

## railway.json の構成

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --include=dev && npm run build"
  },
  "deploy": {
    "startCommand": "node build",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## トラブルシューティング

### データベース接続エラー

- `DATABASE_URL` が正しく設定されているか確認
- Railway の内部 PostgreSQL を使用する場合、`DB_SSL_MODE=disable` を設定
- Railway ダッシュボードの **Deployments** > **View Logs** でエラー内容を確認

### 500 Internal Server Error

- 環境変数（`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`ORIGIN`）がすべて設定されているか確認
- `ORIGIN` の値に末尾のスラッシュ (`/`) を含めないこと

### Google ログインが動作しない

- `ORIGIN` の値が実際のデプロイ URL と一致しているか確認
- Google Cloud Console のリダイレクト URI が正しく設定されているか確認

## Railway の料金

Railway は使用量ベースの料金体系です:

- **Hobby Plan** ($5/月): 個人プロジェクト向け、$5 分のリソースクレジット含む
- **Pro Plan** ($20/月): チーム向け、追加機能あり
- 無料トライアルあり（$5 分のクレジット、500 時間の実行時間）
