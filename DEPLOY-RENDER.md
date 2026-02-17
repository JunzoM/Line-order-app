# Render.com 無料デプロイガイド

## なぜRenderがおすすめか
✅ 完全無料プラン（クレカ不要）
✅ 自動デプロイ（Gitプッシュで自動更新）
✅ HTTPS標準対応
✅ 簡単な環境変数設定
✅ 初心者にも優しいUI

## デプロイ手順（約10分）

### ステップ1: GitHubにコードをアップロード

1. GitHubアカウントを作成（持っていない場合）
   https://github.com/

2. 新しいリポジトリを作成
   - リポジトリ名: `line-order-app`
   - Public または Private（どちらでもOK）
   - 「Create repository」をクリック

3. ローカルのコードをGitHubにプッシュ
```bash
# プロジェクトディレクトリで実行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/line-order-app.git
git push -u origin main
```

### ステップ2: Renderアカウント作成

1. https://render.com/ にアクセス
2. 「Get Started」をクリック
3. GitHubアカウントで連携ログイン

### ステップ3: 新しいWebサービスを作成

1. ダッシュボードで「New +」→「Web Service」をクリック

2. GitHubリポジトリを接続
   - 「Connect a repository」セクションで作成したリポジトリを選択
   - 「Connect」をクリック

3. サービス設定を入力
   ```
   Name: line-order-app（任意の名前）
   Region: Singapore（日本に近いサーバー）
   Branch: main
   Root Directory: （空欄のまま）
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. プランを選択
   - **「Free」を選択**（月0ドル）
   - 注意: 無料プランは15分間アクセスがないとスリープします

### ステップ4: 環境変数を設定

1. 「Environment」タブをクリック

2. 「Add Environment Variable」で以下を追加:
   ```
   Key: LINE_CHANNEL_ACCESS_TOKEN
   Value: あなたのチャネルアクセストークン
   
   Key: LINE_USER_ID
   Value: あなたのユーザーID/グループID
   
   Key: PORT
   Value: 3000
   ```

3. 「Save Changes」をクリック

### ステップ5: デプロイ

1. 設定が完了すると自動的にデプロイが開始されます
2. ビルドログで進行状況を確認
3. 「Live」と表示されたら完成！

### ステップ6: アプリにアクセス

1. サービスのURLが表示されます
   例: `https://line-order-app.onrender.com`

2. このURLをブラウザで開いて動作確認

3. スマホのホーム画面に追加すると、アプリのように使えます！
   - Safari: 共有ボタン → 「ホーム画面に追加」
   - Chrome: メニュー → 「ホーム画面に追加」

## 🔄 更新方法

コードを修正したら、GitHubにプッシュするだけで自動デプロイ:
```bash
git add .
git commit -m "Update message"
git push
```

Renderが自動的に検知して再デプロイします！

## ⚠️ 無料プランの制限

1. **スリープ機能**
   - 15分間アクセスがないとスリープ
   - 次回アクセス時に起動（約30秒かかる）
   - 解決策: 定期的にアクセスするツールを使う（後述）

2. **月750時間の稼働制限**
   - 1ヶ月 = 744時間なので、ほぼ24時間稼働可能
   - 複数サービスがある場合は合計で750時間

3. **メモリ512MB**
   - このアプリには十分

## 🚀 スリープ対策（オプション）

無料で定期的にアクセスしてスリープを防ぐ方法:

### 方法1: UptimeRobot（推奨）
1. https://uptimerobot.com/ でアカウント作成
2. 「Add New Monitor」をクリック
3. 設定:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: LINE Order App
   URL: https://あなたのアプリ.onrender.com/api/health
   Monitoring Interval: 5 minutes
   ```
4. 「Create Monitor」で完了

これで5分ごとにアクセスして、常時起動状態を維持できます！

### 方法2: Cron-job.org
1. https://cron-job.org/ でアカウント作成
2. 同様に定期アクセスを設定

## 💡 トラブルシューティング

### デプロイが失敗する
- ビルドログを確認
- `package.json` が正しいか確認
- Node.jsバージョンを指定する場合:
  ```json
  "engines": {
    "node": ">=14.0.0"
  }
  ```

### 環境変数が反映されない
- 環境変数を保存後、手動で「Deploy」→「Clear build cache & deploy」

### アプリが起動しない
- ログタブで詳細エラーを確認
- PORTが正しく設定されているか確認

## 📊 コスト比較

| サービス | 無料プラン | スリープ | HTTPS | 簡単さ |
|---------|-----------|---------|-------|--------|
| Render | ✅ | 15分後 | ✅ | ⭐⭐⭐⭐⭐ |
| Railway | ✅ 500時間/月 | なし | ✅ | ⭐⭐⭐⭐ |
| Vercel | ✅ | なし | ✅ | ⭐⭐⭐ |

## 🎉 完了！

これでスマホからいつでもどこでも発注できます！

URL例: `https://line-order-app.onrender.com`

社内やチームで共有して使ってください 🚀
