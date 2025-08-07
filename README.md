# StockX Arbitrage Monitor

**完全無料で24時間監視可能なアービトラージツール**

StockXと日本サイトの価格差を監視し、利益機会を見つけるツール

## 🚀 機能

- **StockX価格取得**: リアルタイムでStockXの価格を取得
- **日本サイト比較**: SNKRDUNK、メルカリ、Yahoo!ショッピング、楽天市場の価格を比較
- **利益計算**: 関税30%、手数料、送料を考慮した詳細な利益計算
- **3日間価格履歴**: 価格変動の可視化
- **利益商品ハイライト**: 利益が出る商品のみ表示
- **為替レート自動更新**: リアルタイム為替レート取得
- **ダッシュボード**: 直感的なWebインターフェース

## 🛠 技術スタック

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Scraping**: Puppeteer, Axios
- **Automation**: GitHub Actions (30分ごと自動実行)
- **Hosting**: GitHub Pages (無料)

## 📋 前提条件

- Node.js 18以上
- GitHub アカウント
- Supabase アカウント
- npm または yarn

## 🔧 セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/stock-arbitrage-monitor.git
cd stock-arbitrage-monitor
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Supabase設定

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとService Role Keyを取得

```bash
# 環境変数設定
cp env.example .env
```

`.env`ファイルを編集してSupabase接続情報を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAKUTEN_API_KEY=your_rakuten_api_key
```

### 4. データベーススキーマ作成

SupabaseダッシュボードのSQL Editorで以下のSQLを実行：

```sql
-- lib/supabase.jsのinitializeSchema()で出力されるSQLを実行
```

### 5. GitHub Secrets設定

GitHubリポジトリのSettings > Secrets and variables > Actionsで以下を設定：

- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key
- `RAKUTEN_API_KEY`: 楽天APIキー（オプション）

### 6. GitHub Pages設定

1. リポジトリのSettings > Pages
2. Source: Deploy from a branch
3. Branch: gh-pages
4. フォルダ: / (root)

### 7. 開発サーバー起動

```bash
npm run dev
```

アプリケーションは http://localhost:3000 でアクセス可能です。

## 📊 データベーススキーマ

### 主要テーブル

- **products**: 商品マスタ情報
- **sizes**: サイズ情報
- **price_history**: 価格履歴と利益計算結果
- **alerts**: アラート設定
- **exchange_rates**: 為替レート履歴
- **scrape_history**: スクレイピング履歴

## 🔄 スクレイピング設定

### 更新頻度

- **人気商品**: 30分ごと
- **通常商品**: 2時間ごと
- **為替レート**: 1時間ごと

### スクレイピング対象サイト

- **StockX**: 商品検索と価格取得
- **スニーカーダンク**: 検索結果からの価格抽出
- **メルカリ**: キーワード検索からの価格抽出
- **ヤフオク**: オークション検索からの価格抽出
- **楽天市場**: APIを使用した価格取得

## 💰 利益計算ロジック

### 計算式

```
利益 = StockX販売価格(円) - 日本仕入れ価格 - 経費合計
利益率 = (利益 / 日本仕入れ価格) × 100
```

### 経費内訳

- **StockX手数料**: 販売価格の12.5%
- **関税**: スニーカーは30%（最低4,300円）、サンダルは0円
- **国内送料**: 700円（平均値）
- **国際送料**: StockX負担のため0円

## 🚀 デプロイ

### GitHub Pages（自動デプロイ）

1. リポジトリをGitHubにプッシュ
2. GitHub Actionsが自動的にビルドとデプロイを実行
3. `https://yourusername.github.io/stock-arbitrage-monitor` でアクセス可能

### 手動デプロイ

```bash
# ビルド
npm run build

# 静的ファイル出力
npm run export

# outフォルダの内容をGitHub Pagesにアップロード
```

### 環境変数設定

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAKUTEN_API_KEY=your_rakuten_api_key
```

## 📝 API エンドポイント

### 商品データ

- `GET /api/products` - 商品一覧取得
- `GET /api/products/:id` - 商品詳細取得

### 統計データ

- `GET /api/stats` - 統計情報取得
- `GET /api/exchange-rates` - 為替レート取得

### スクレイピング

- `POST /api/scrape/trigger` - 手動スクレイピング実行

## 🔧 開発

### スクリプト

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 静的ファイル出力（GitHub Pages用）
npm run export

# 本番サーバー起動
npm start

# スクレイピング実行
npm run scrape
```

### ディレクトリ構造

```
stockx-arbitrage-monitor/
├── app/                    # Next.js App Router
│   ├── api/               # API エンドポイント
│   ├── globals.css        # グローバルスタイル
│   ├── layout.js          # ルートレイアウト
│   └── page.js            # メインページ
├── components/            # React コンポーネント
├── lib/                   # ユーティリティライブラリ
├── database/              # データベース関連
├── scripts/               # スクリプト
└── config.example.js      # 設定テンプレート
```

## ⚠️ 注意事項

- スクレイピングは各サイトの利用規約に従って実行してください
- レート制限を避けるため、適切な間隔を設けてスクレイピングを実行してください
- 本ツールは教育・研究目的で作成されています
- 実際の取引には十分な調査とリスク管理を行ってください

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

## 📞 サポート

問題や質問がある場合は、GitHubのイシューを作成してください。
