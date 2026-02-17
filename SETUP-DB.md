# データベース対応版 セットアップガイド

## 🎉 新機能

✅ 商品マスタ管理
✅ 発注履歴の保存・閲覧
✅ ステータス管理（発注済み→確認済み→発送済み→納品済み）
✅ 統計ダッシュボード
✅ 商品情報の自動入力

## 📋 必要なもの

1. Node.js (v14以上)
2. LINE Developersアカウント
3. Supabase アカウント（無料）

---

## ステップ1: Supabaseのセットアップ

### 1-1. アカウント作成
1. https://supabase.com/ にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントで連携ログイン

### 1-2. 新しいプロジェクト作成
1. 「New Project」をクリック
2. 以下を入力：
   - Name: `line-order-app`
   - Database Password: 強力なパスワードを設定（メモしておく）
   - Region: Northeast Asia (Tokyo)
3. 「Create new project」をクリック
4. 初期化完了まで1-2分待機

### 1-3. データベースの作成
1. 左サイドバーの「SQL Editor」をクリック
2. 「New query」をクリック
3. `DATABASE-SCHEMA.md` ファイルの「Supabase セットアップSQL」をコピペ
4. 「Run」をクリックして実行

### 1-4. API情報の取得
1. 左サイドバーの「Settings」→「API」をクリック
2. 以下をメモ：
   - `Project URL` → これが `SUPABASE_URL`
   - `anon public` キー → これが `SUPABASE_ANON_KEY`

---

## ステップ2: LINE Messaging APIのセットアップ

前回のSETUP.mdと同じ手順で：
1. LINE Developersでチャネル作成
2. チャネルアクセストークンを取得
3. ユーザーID/グループIDを取得

詳細は `SETUP.md` を参照してください。

---

## ステップ3: アプリのセットアップ

### 3-1. パッケージインストール
```bash
cd v2
npm install
```

### 3-2. 環境変数の設定
```bash
cp .env.example .env
```

`.env` ファイルを編集：
```env
LINE_CHANNEL_ACCESS_TOKEN=あなたのLINEトークン
LINE_USER_ID=あなたのユーザーID
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
```

### 3-3. サーバー起動
```bash
npm start
```

または開発モード：
```bash
npm run dev
```

---

## ステップ4: 動作確認

### 4-1. ブラウザでアクセス
http://localhost:3000

### 4-2. 商品を登録
1. トップページ（商品管理）で商品を登録
2. 例：
   - 商品名: トマト
   - 単位: 箱
   - カテゴリ: 野菜
   - 仕入先: 田中農園
   - 単価: 1500

### 4-3. 発注してみる
1. 「発注する」タブをクリック
2. 登録した商品を選択
3. 数量を入力
4. 希望納期を選択
5. 発注！

### 4-4. 履歴を確認
1. 「発注履歴」タブをクリック
2. 発注が記録されていることを確認
3. ステータスを変更してみる

---

## 📱 画面構成

### 1. 商品管理画面（/）
- 商品の登録・編集・削除
- 登録済み商品の一覧表示

### 2. 発注画面（/order.html）
- 商品をドロップダウンから選択
- 商品情報が自動表示
- 単位が自動入力

### 3. 発注履歴画面（/history.html）
- 過去の発注を一覧表示
- ステータスでフィルタリング
- ステータスの変更
- 統計情報の表示

---

## 🚀 本番環境デプロイ

### Render.comへのデプロイ

1. GitHubにコードをプッシュ
```bash
git add .
git commit -m "Add database version"
git push
```

2. Render.comで環境変数を設定：
```
LINE_CHANNEL_ACCESS_TOKEN = あなたのトークン
LINE_USER_ID = あなたのユーザーID
SUPABASE_URL = あなたのSupabase URL
SUPABASE_ANON_KEY = あなたのSupabase Key
PORT = 3000
```

3. デプロイ完了！

---

## 📊 データベーステーブル

### products（商品マスタ）
- 商品の基本情報を管理
- カテゴリ、仕入先、単価など

### orders（発注履歴）
- すべての発注を記録
- ステータス管理
- LINE送信履歴

詳細は `DATABASE-SCHEMA.md` を参照。

---

## 🔧 カスタマイズ

### 単位の追加
`frontend/index.html` と `frontend/order.html` の単位選択肢を編集

### ステータスの追加
1. `server.js` の `validStatuses` に追加
2. `frontend/history.html` のバッジスタイルを追加

### カテゴリの管理
必要に応じて `categories` テーブルを実装

---

## 💡 便利な機能

### よく使う商品を上位に表示
Supabaseダッシュボードで発注回数を集計してソート

### 月次レポート
`/api/statistics` エンドポイントをカスタマイズ

### 承認フロー
ユーザー管理テーブルを追加して、承認プロセスを実装

---

## 🆚 旧バージョンとの違い

| 機能 | 旧版 | DB版 |
|------|------|------|
| 商品管理 | ❌ | ✅ |
| 発注履歴 | ❌ | ✅ |
| 自動入力 | ❌ | ✅ |
| ステータス管理 | ❌ | ✅ |
| 統計情報 | ❌ | ✅ |
| データベース | ❌ | ✅ Supabase |

---

## 🎯 次のステップ

1. ✅ 基本機能の動作確認
2. ✅ 本番環境へのデプロイ
3. 📱 スマホのホーム画面に追加
4. 👥 チームメンバーと共有
5. 📊 使用状況を分析

---

## 📞 トラブルシューティング

### Supabaseに接続できない
- `SUPABASE_URL` と `SUPABASE_ANON_KEY` が正しいか確認
- Supabaseプロジェクトが起動しているか確認

### 商品が表示されない
- SQL実行でエラーがなかったか確認
- Supabaseダッシュボードの「Table Editor」でデータを確認

### LINEに送信されない
- 旧版のSETUP.mdを参照
- LINE設定が正しいか確認

---

**データベース対応でさらにパワフルな発注システムに！ 🚀**
