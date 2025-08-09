const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
  // process.exit(1); // 開発環境では終了しない
}

// Supabaseクライアント作成
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// データベース接続テスト
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✓ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Supabase connection failed:', error.message);
    return false;
  }
}

// スキーマ初期化（Supabaseでは手動でテーブル作成）
async function initializeSchema() {
  console.log('⚠️ Supabaseでは手動でテーブルを作成してください');
  console.log('Supabaseダッシュボードで以下のSQLを実行してください:');
  
  const schema = `
-- 商品マスタテーブル
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  brand VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  image_url TEXT,
  stockx_url TEXT,
  popularity_rank INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- サイズマスタテーブル
CREATE TABLE IF NOT EXISTS sizes (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  size_us VARCHAR(10) NOT NULL,
  size_jp VARCHAR(10),
  size_eu VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 価格履歴テーブル（3日間のみ保持）
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  size_id BIGINT REFERENCES sizes(id) ON DELETE CASCADE,
  
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
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- 為替レート履歴テーブル
CREATE TABLE IF NOT EXISTS exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  from_currency VARCHAR(3) DEFAULT 'USD',
  to_currency VARCHAR(3) DEFAULT 'JPY',
  rate DECIMAL(8,4) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_popularity ON products(popularity_rank);
CREATE INDEX IF NOT EXISTS idx_price_history_product_recorded ON price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_profit ON price_history(is_profitable, profit_rate DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_recorded ON exchange_rates(recorded_at DESC);

-- 3日以上古い価格履歴を自動削除する関数
CREATE OR REPLACE FUNCTION cleanup_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM price_history 
  WHERE recorded_at < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- 毎日実行されるクリーンアップジョブ（手動で設定）
-- SELECT cron.schedule('cleanup-price-history', '0 2 * * *', 'SELECT cleanup_old_price_history();');
  `;
  
  console.log(schema);
  return true;
}

// 商品データ取得
async function getProducts(filters = {}) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }
  
  let query = supabase
    .from('products')
    .select(`
      *,
      price_history(
        net_profit,
        profit_rate,
        recorded_at,
        stockx_lowest_ask,
        japan_lowest_price,
        japan_lowest_source
      )
    `)
    .eq('is_active', true)
    .order('popularity_rank', { ascending: true });
  
  if (filters.brand) {
    query = query.in('brand', Array.isArray(filters.brand) ? filters.brand : [filters.brand]);
  }
  
  if (filters.category) {
    query = query.in('category', Array.isArray(filters.category) ? filters.category : [filters.category]);
  }
  
  if (filters.minProfit) {
    query = query.gte('price_history.net_profit', filters.minProfit);
  }
  
  const { data, error } = await query.limit(100);
  
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  
  // 各商品の最新価格データのみを取得
  const processedData = (data || []).map(product => {
    if (product.price_history && product.price_history.length > 0) {
      // 最新の価格データを取得（recorded_atでソート）
      const latestPrice = product.price_history
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0];
      
      return {
        ...product,
        price_history: [latestPrice]
      };
    }
    return product;
  });
  
  return processedData;
}

// 商品詳細取得
async function getProductDetail(productId) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('is_active', true)
    .single();
  
  if (productError || !product) {
    return null;
  }
  
  const { data: sizes, error: sizesError } = await supabase
    .from('sizes')
    .select(`
      *,
      price_history(
        stockx_lowest_ask,
        japan_lowest_price,
        japan_lowest_source,
        net_profit,
        profit_rate,
        is_profitable,
        recorded_at
      )
    `)
    .eq('product_id', productId)
    .order('size_us', { ascending: true });
  
  if (sizesError) {
    console.error('Error fetching sizes:', sizesError);
    return { ...product, sizes: [] };
  }
  
  return {
    ...product,
    sizes: sizes || []
  };
}

// 価格履歴保存
async function savePriceHistory(priceData) {
  const { data, error } = await supabase
    .from('price_history')
    .insert({
      product_id: priceData.productId,
      size_id: priceData.sizeId,
      stockx_lowest_ask: priceData.stockxLowestAsk,
      stockx_highest_bid: priceData.stockxHighestBid,
      stockx_last_sale: priceData.stockxLastSale,
      snkrdunk_price: priceData.snkrdunkPrice,
      mercari_price: priceData.mercariPrice,
      yahoo_price: priceData.yahooPrice,
      rakuten_price: priceData.rakutenPrice,
      japan_lowest_price: priceData.japanLowestPrice,
      japan_lowest_source: priceData.japanLowestSource,
      exchange_rate: priceData.exchangeRate,
      revenue_jpy: priceData.revenueJpy,
      stockx_fee: priceData.stockxFee,
      shipping_cost: priceData.shippingCost,
      customs_duty: priceData.customsDuty,
      domestic_shipping: priceData.domesticShipping,
      net_profit: priceData.netProfit,
      profit_rate: priceData.profitRate,
      is_profitable: priceData.isProfitable
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error saving price history:', error);
    throw error;
  }
  
  return data.id;
}

// 為替レート取得
async function getLatestExchangeRate() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'JPY')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    return 155; // デフォルト値
  }
  
  return data.rate;
}

// 為替レート保存
async function saveExchangeRate(rate) {
  const { error } = await supabase
    .from('exchange_rates')
    .insert({
      from_currency: 'USD',
      to_currency: 'JPY',
      rate: rate
    });
  
  if (error) {
    console.error('Error saving exchange rate:', error);
    throw error;
  }
}

// 古い価格履歴を削除（3日以上）
async function cleanupOldPriceHistory() {
  const { error } = await supabase
    .from('price_history')
    .delete()
    .lt('recorded_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
  
  if (error) {
    console.error('Error cleaning up old price history:', error);
    throw error;
  }
  
  console.log('✓ Old price history cleaned up');
}

module.exports = {
  supabase,
  testConnection,
  initializeSchema,
  getProducts,
  getProductDetail,
  savePriceHistory,
  getLatestExchangeRate,
  saveExchangeRate,
  cleanupOldPriceHistory
};
