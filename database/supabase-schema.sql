-- StockX Arbitrage Monitor Database Schema for Supabase

-- 商品マスタテーブル
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'sneakers' or 'sandals'
  image_url TEXT,
  stockx_url TEXT,
  popularity_rank INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- サイズマスタテーブル
CREATE TABLE IF NOT EXISTS sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  size_us VARCHAR(10) NOT NULL,
  size_jp VARCHAR(10),
  size_eu VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 価格履歴テーブル
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  size_id INTEGER REFERENCES sizes(id) ON DELETE CASCADE,
  
  -- StockX価格データ
  stockx_lowest_ask DECIMAL(10,2),
  stockx_highest_bid DECIMAL(10,2),
  stockx_last_sale DECIMAL(10,2),
  stockx_currency VARCHAR(3) DEFAULT 'USD',
  
  -- 日本サイト価格データ
  snkrdunk_price DECIMAL(10,0),
  mercari_price DECIMAL(10,0),
  yahoo_price DECIMAL(10,0),
  rakuten_price DECIMAL(10,0),
  japan_lowest_price DECIMAL(10,0),
  japan_lowest_source VARCHAR(50),
  
  -- 利益計算データ
  exchange_rate DECIMAL(8,4),
  revenue_jpy DECIMAL(10,0),
  stockx_fee DECIMAL(10,0),
  shipping_cost DECIMAL(10,0),
  customs_duty DECIMAL(10,0),
  domestic_shipping DECIMAL(10,0),
  net_profit DECIMAL(10,0),
  profit_rate DECIMAL(5,2),
  
  -- メタデータ
  is_profitable BOOLEAN DEFAULT false,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 為替レート履歴テーブル
CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(3) DEFAULT 'USD',
  to_currency VARCHAR(3) DEFAULT 'JPY',
  rate DECIMAL(8,4) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- スクレイピング履歴テーブル
CREATE TABLE IF NOT EXISTS scrape_history (
  id SERIAL PRIMARY KEY,
  site_name VARCHAR(50) NOT NULL,
  product_count INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  duration_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_popularity ON products(popularity_rank);
CREATE INDEX IF NOT EXISTS idx_price_history_product_recorded ON price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_profit ON price_history(is_profitable, profit_rate DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_recorded ON exchange_rates(recorded_at DESC);

-- 更新時刻自動更新のトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期データ（人気商品）
INSERT INTO products (brand, name, sku, category, popularity_rank) VALUES
('Nike', 'Dunk Low Panda', 'DD1391-100', 'sneakers', 1),
('Nike', 'Air Jordan 1 Low OG Bred Toe', '553558-612', 'sneakers', 2),
('Adidas', 'Yeezy Boost 350 V2 Cream', 'CP9366', 'sneakers', 3),
('Nike', 'Air Force 1 Low White', '315122-111', 'sneakers', 4),
('Nike', 'Dunk Low University Blue', 'DD1391-102', 'sneakers', 5),
('Nike', 'Air Jordan 1 High OG White', 'BQ6817-100', 'sneakers', 6),
('Nike', 'Air Jordan 1 High OG Shadow', '555088-105', 'sneakers', 7),
('Nike', 'Air Jordan 1 High OG Chicago', 'CW2288-111', 'sneakers', 8),
('Nike', 'Air Jordan 1 High OG Black', '555088-001', 'sneakers', 9),
('Nike', 'Air Jordan 1 High OG White', '555088-101', 'sneakers', 10)
ON CONFLICT (sku) DO NOTHING;

-- デフォルトサイズを追加
INSERT INTO sizes (product_id, size_us, size_jp, size_eu) 
SELECT id, '9', '27.5', '42.5' FROM products
ON CONFLICT DO NOTHING;
