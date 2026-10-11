# todo_app_front

TypeScript + Next.js のワークスペース型課題管理 UI（日本語 / レスポンシブ）。

バックエンドは `todo_app_back`（FastAPI + PostgreSQL）を利用します。

## 必要条件

- Node.js 20+
- 起動中の API（デフォルト `http://localhost:8000`）

## セットアップ

```bash
npm install
cp .env.local.example .env.local
# 必要なら NEXT_PUBLIC_API_BASE_URL を編集
```

## 起動

```bash
npm run dev
```

http://localhost:3000 を開きます。

## 機能

- メール＋パスワードのログイン / 新規登録
- ワークスペース一覧・作成（グローバル管理者のみ作成可）
- 招待リンクでの参加
- ワークスペース内画面 IA（ダッシュボード / 課題追加 / 課題一覧 / 課題詳細）
- PC はサイドメニュー、スマホはハンバーガーメニュー
- 課題の作成・編集・削除（Backlog 風フィールド）
- 親子課題・関連課題・添付ファイル

## ワークスペース内ルート

ワークスペース選択後（`/workspaces/{id}`）:

| 画面 | パス |
|------|------|
| ダッシュボード（最近のタスク / 自分の担当） | `/workspaces/{id}` |
| 課題一覧 | `/workspaces/{id}/tasks` |
| 課題追加 | `/workspaces/{id}/tasks/new` |
| 課題詳細 | `/workspaces/{id}/tasks/{taskId}` |

## 環境変数

| 変数 | 説明 | 例 |
|------|------|----|
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI のベース URL | `http://localhost:8000` |
