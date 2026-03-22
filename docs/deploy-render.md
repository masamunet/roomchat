# Render デプロイガイド

RoomChat を Render にデプロイする手順です。

## 前提条件

- GitHub リポジトリに push 済みであること
- [Render](https://render.com/) のアカウントがあること
- Google OAuth の Client ID / Client Secret を取得済みであること

## デプロイ手順

### 1. Blueprint でデプロイ（推奨）

このリポジトリには `render.yaml`（Blueprint）が含まれており、Web Service と PostgreSQL データベースが自動で構成されます。

1. Render ダッシュボードで **New** > **Blueprint** を選択
2. GitHub リポジトリ `masamunet/roomchat` を接続
3. Blueprint が自動検出され、以下のリソースが作成される:
   - **Web Service**: `roomchat`
   - **PostgreSQL Database**: `roomchat-db`
4. `DATABASE_URL` はデータベースから自動的に注入される

### 2. 環境変数の設定

Blueprint デプロイ後、以下の環境変数を Render ダッシュボードで手動設定してください。

| 環境変数 | 説明 | 例 |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | `GOCSPX-xxxx` |
| `ORIGIN` | アプリの公開 URL | `https://roomchat.onrender.com` |

設定方法:
1. Render ダッシュボードで `roomchat` サービスを選択
2. **Environment** タブを開く
3. 各環境変数を入力して保存

### 3. Google OAuth のリダイレクト URI 設定

[Google Cloud Console](https://console.cloud.google.com/) で、OAuth 2.0 クライアントの「承認済みのリダイレクト URI」に以下を追加してください:

```
https://<your-app-name>.onrender.com/auth/google/callback
```

## 手動デプロイ（Blueprint を使わない場合）

### Web Service の作成

1. Render ダッシュボードで **New** > **Web Service** を選択
2. GitHub リポジトリを接続
3. 以下を設定:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node build`

### PostgreSQL データベースの作成

1. Render ダッシュボードで **New** > **PostgreSQL** を選択
2. データベースを作成
3. 作成後に表示される **Internal Database URL** をコピー
4. Web Service の環境変数に `DATABASE_URL` として設定

## render.yaml の構成

```yaml
services:
  - type: web
    name: roomchat
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: node build
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: roomchat-db
          property: connectionString
      - key: GOOGLE_CLIENT_ID
        sync: false          # ダッシュボードで手動設定
      - key: GOOGLE_CLIENT_SECRET
        sync: false          # ダッシュボードで手動設定
      - key: ORIGIN
        sync: false          # ダッシュボードで手動設定
      - key: NODE_ENV
        value: production

databases:
  - name: roomchat-db
    plan: free               # 無料プラン
```

## トラブルシューティング

### データベース接続エラー

- `DATABASE_URL` が正しく設定されているか確認
- Render の PostgreSQL は外部接続時に SSL が必須（アプリ側で自動対応済み）
- Render ダッシュボードの **Logs** タブでエラー内容を確認

### 500 Internal Server Error

- 環境変数（`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`ORIGIN`）がすべて設定されているか確認
- `ORIGIN` の値に末尾のスラッシュ (`/`) を含めないこと

### Google ログインが動作しない

- `ORIGIN` の値が実際のデプロイ URL と一致しているか確認
- Google Cloud Console のリダイレクト URI が正しく設定されているか確認

## 無料プランの制限

Render の無料プランには以下の制限があります:

- **Web Service**: 15分間アクセスがないとスリープ（初回アクセス時に起動に時間がかかる）
- **PostgreSQL**: 90日間でデータベースが削除される

本番運用には有料プランの利用を推奨します。
