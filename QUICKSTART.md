# 🚀 クイックスタートガイド

このガイドに従えば、**5分でアプリを起動**できます！

## 📋 必要なもの

- Node.js (https://nodejs.org/ からインストール)
- LINEアカウント
- 5分の時間

---

## ステップ1: Supabaseセットアップ（2分）

### 1. アカウント作成
1. https://supabase.com/ を開く
2. 「Start your project」をクリック
3. GitHubでログイン

### 2. プロジェクト作成
1. 「New Project」をクリック
2. 入力:
   - Name: `line-order-app`
   - Database Password: 強力なパスワード（メモする）
   - Region: `Northeast Asia (Tokyo)`
3. 「Create new project」をクリック
4. 1-2分待つ

### 3. データベース作成
1. 左メニューの「SQL Editor」をクリック
2. 「New query」をクリック
3. `DATABASE-SCHEMA.md`ファイルを開く
4. 「Supabase セットアップSQL」の部分をすべてコピー
5. SQL Editorに貼り付けて「Run」をクリック
6. 成功メッセージが出ればOK！

### 4. 認証情報を取得
1. 左メニューの「Settings」→「API」をクリック
2. 以下をメモ:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## ステップ2: LINE Messaging API（2分）

### 1. LINE Developersにログイン
https://developers.line.biz/console/

### 2. チャネル作成
1. 「作成」→「Messaging API」
2. 入力して作成

### 3. トークンを取得
1. 「Messaging API設定」タブ
2. 「チャネルアクセストークン」を発行
3. コピーしてメモ

### 4. ユーザーIDを取得
**簡単な方法:**
1. BOTのQRコードをスキャンして友達追加
2. `get-user-id.js`を使用（後述）

**または:**
- LINE公式アカウントの設定からユーザーIDを確認

---

## ステップ3: アプリ起動（1分）

### 1. パッケージインストール
```bash
npm install
```

### 2. 環境変数を設定
```bash
# Windowsの場合
copy .env.example .env

# Mac/Linuxの場合
cp .env.example .env
```

### 3. .envファイルを編集
テキストエディタで`.env`を開いて編集:

```env
LINE_CHANNEL_ACCESS_TOKEN=取得したLINEトークン
LINE_USER_ID=取得したユーザーID
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
```

### 4. サーバー起動
```bash
npm start
```

成功すると:
```
サーバーが起動しました: http://localhost:3000
LINE Messaging API設定確認:
- Channel Access Token: 設定済み
- User/Group ID: 設定済み
Supabase設定確認:
- Supabase URL: 設定済み
- Supabase Key: 設定済み
```

---

## ステップ4: 動作確認（1分）

### 1. ブラウザで開く
http://localhost:3000

### 2. ログイン
デフォルトアカウントでログイン:
- **ユーザー名**: admin
- **パスワード**: admin123

### 3. 商品を登録（管理者のみ）
1. 商品名: トマト
2. 単位: 箱
3. カテゴリ: 野菜
4. 「商品を登録」をクリック

### 4. 発注してみる
1. 「発注する」タブをクリック
2. 「トマト」を選択
3. 数量: 10
4. 「発注内容を確認」→「LINEに送信」

### 5. LINEを確認
スマホのLINEアプリで通知が届けばOK！ 🎉

---

## 👥 ユーザー管理

### デフォルトアカウント
- **ユーザー名**: admin
- **パスワード**: admin123
- **権限**: 管理者

### 権限の違い
- **管理者（admin）**: 全機能利用可能（商品管理、発注、履歴）
- **一般ユーザー（user）**: 発注と履歴のみ

### 新しいユーザーの追加
現在は管理者のみがデフォルトで作成されています。
新しいユーザーを追加する場合は、Supabaseの管理画面から直接追加するか、
ユーザー登録画面を追加で実装してください。

**Supabaseで直接追加する場合:**
1. Supabaseダッシュボード → Table Editor → users
2. Insert row で新しいユーザーを追加
3. password_hashは bcrypt でハッシュ化が必要

**簡易的な方法:**
以下のSQLでユーザーを追加（パスワード: password123）:
```sql
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('user1', 'user1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '山田太郎', 'user');
```

---

## 🔧 ユーザーIDの取得（オプション）

ユーザーIDが分からない場合:

### 方法1: get-user-id.jsを使用

1. 別のターミナルで実行:
```bash
node get-user-id.js
```

2. ngrokで公開:
```bash
npx ngrok http 3001
```

3. ngrokのURLをLINE DevelopersのWebhook URLに設定

4. BOTにメッセージを送信

5. ターミナルにユーザーIDが表示される

### 方法2: 簡易的な方法
- グループに招待してグループIDを使用
- LINE Official Account Managerから確認

---

## 📱 スマホで使う

### iPhoneの場合
1. Safariで開く
2. 共有ボタン → 「ホーム画面に追加」
3. アプリのように使える！

### Androidの場合
1. Chromeで開く
2. メニュー → 「ホーム画面に追加」

---

## ❓ トラブルシューティング

### エラー: Cannot find module
```bash
npm install
```

### エラー: Port 3000 is already in use
`.env`のPORTを変更:
```env
PORT=3001
```

### Supabaseに接続できない
- URLとKeyが正しいか確認
- Supabaseプロジェクトが起動しているか確認

### LINEに送信されない
- トークンが正しいか確認
- BOTをブロックしていないか確認

---

## 🎉 完了！

おめでとうございます！発注システムが稼働しました。

### 次のステップ
1. 商品をもっと登録
2. チームメンバーに共有
3. 本番環境にデプロイ（DEPLOY-GUIDE.md参照）

### サポート
- 詳細: SETUP-DB.md
- デプロイ: DEPLOY-GUIDE.md  
- DB設計: DATABASE-SCHEMA.md

**Happy Ordering! 🚀**
