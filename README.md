# todo_app_front

TypeScript + Next.js の Todo フロントエンド（日本語 UI / レスポンシブ）。

バックエンド API（`todo_app_back`）と組み合わせて使います。

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

ブラウザで http://localhost:3000 を開きます。

## 環境変数

| 変数 | 説明 | 例 |
|------|------|----|
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI のベース URL | `http://localhost:8000` |

## 機能

- Todo の作成 / 一覧 / 完了トグル / タイトル編集 / 削除
- すべて / 未完了 / 完了 のフィルタ
- PC・スマートフォン向けレスポンシブレイアウト
