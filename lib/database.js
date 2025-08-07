const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 設定ファイル読み込み（config.jsがあれば使用、なければ環境変数）
let config = {};
try {
  config = require('../config.js');
} catch (error) {
  console.log('config.js not found, using environment variables');
}

// データベース接続プール
const pool = new Pool({
  host: config.database?.host || process.env.DB_HOST || 'localhost',
  port: config.database?.port || process.env.DB_PORT || 5432,
  database: config.database?.database || process.env.DB_NAME || 'stockx_arbitrage',
  user: config.database?.username || process.env.DB_USER || 'postgres',
  password: config.database?.password || process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// データベース接続テスト
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// スキーマ初期化
async function initializeSchema() {
  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const client = await pool.connect();
    await client.query(schema);
    client.release();
    
    console.log('✓ Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('✗ Schema initialization failed:', error.message);
    return false;
  }
}

// クエリ実行ヘルパー
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error.message, { text: text.substring(0, 100), params });
    throw error;
  }
}

// トランザクションヘルパー
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 商品データ取得
async function getProducts(filters = {}) {
  let queryText = `
    SELECT p.*, 
           COALESCE(latest.net_profit, 0) as latest_profit,
           COALESCE(latest.profit_rate, 0) as latest_profit_rate,
           latest.recorded_at as last_price_update
    FROM products p
    LEFT JOIN LATERAL (
      SELECT net_profit, profit_rate, recorded_at
      FROM price_history ph
      WHERE ph.product_id = p.id AND ph.is_profitable = true
      ORDER BY recorded_at DESC
      LIMIT 1
    ) latest ON true
    WHERE p.is_active = true
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (filters.brand) {
    queryText += ` AND p.brand = ANY($${paramIndex})`;
    params.push(Array.isArray(filters.brand) ? filters.brand : [filters.brand]);
    paramIndex++;
  }
  
  if (filters.category) {
    queryText += ` AND p.category = ANY($${paramIndex})`;
    params.push(Array.isArray(filters.category) ? filters.category : [filters.category]);
    paramIndex++;
  }
  
  if (filters.minProfit) {
    queryText += ` AND COALESCE(latest.net_profit, 0) >= $${paramIndex}`;
    params.push(filters.minProfit);
    paramIndex++;
  }
  
  // ソート
  const sortBy = filters.sortBy || 'popularity';
  switch (sortBy) {
    case 'profit':
      queryText += ' ORDER BY latest.net_profit DESC NULLS LAST';
      break;
    case 'profit_rate':
      queryText += ' ORDER BY latest.profit_rate DESC NULLS LAST';
      break;
    case 'popularity':
    default:
      queryText += ' ORDER BY p.popularity_rank ASC';
      break;
  }
  
  queryText += ' LIMIT 100';
  
  const result = await query(queryText, params);
  return result.rows;
}

// 商品詳細取得
async function getProductDetail(productId) {
  const productQuery = `
    SELECT * FROM products WHERE id = $1 AND is_active = true
  `;
  
  const sizesQuery = `
    SELECT s.*, 
           ph.stockx_lowest_ask,
           ph.japan_lowest_price,
           ph.japan_lowest_source,
           ph.net_profit,
           ph.profit_rate,
           ph.is_profitable,
           ph.recorded_at
    FROM sizes s
    LEFT JOIN LATERAL (
      SELECT stockx_lowest_ask, japan_lowest_price, japan_lowest_source,
             net_profit, profit_rate, is_profitable, recorded_at
      FROM price_history ph
      WHERE ph.size_id = s.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) ph ON true
    WHERE s.product_id = $1
    ORDER BY s.size_us::float
  `;
  
  const [productResult, sizesResult] = await Promise.all([
    query(productQuery, [productId]),
    query(sizesQuery, [productId])
  ]);
  
  if (productResult.rows.length === 0) {
    return null;
  }
  
  return {
    ...productResult.rows[0],
    sizes: sizesResult.rows
  };
}

// 価格履歴保存
async function savePriceHistory(priceData) {
  const insertQuery = `
    INSERT INTO price_history (
      product_id, size_id, stockx_lowest_ask, stockx_highest_bid, stockx_last_sale,
      snkrdunk_price, mercari_price, yahoo_price, rakuten_price,
      japan_lowest_price, japan_lowest_source,
      exchange_rate, revenue_jpy, stockx_fee, shipping_cost, customs_duty,
      domestic_shipping, net_profit, profit_rate, is_profitable
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) RETURNING id
  `;
  
  const result = await query(insertQuery, [
    priceData.productId, priceData.sizeId, priceData.stockxLowestAsk,
    priceData.stockxHighestBid, priceData.stockxLastSale,
    priceData.snkrdunkPrice, priceData.mercariPrice, priceData.yahooPrice, priceData.rakutenPrice,
    priceData.japanLowestPrice, priceData.japanLowestSource,
    priceData.exchangeRate, priceData.revenueJpy, priceData.stockxFee,
    priceData.shippingCost, priceData.customsDuty, priceData.domesticShipping,
    priceData.netProfit, priceData.profitRate, priceData.isProfitable
  ]);
  
  return result.rows[0].id;
}

// 為替レート取得
async function getLatestExchangeRate() {
  const result = await query(`
    SELECT rate FROM exchange_rates 
    WHERE from_currency = 'USD' AND to_currency = 'JPY'
    ORDER BY recorded_at DESC 
    LIMIT 1
  `);
  
  return result.rows[0]?.rate || 155; // デフォルト値
}

// 為替レート保存
async function saveExchangeRate(rate) {
  await query(`
    INSERT INTO exchange_rates (from_currency, to_currency, rate)
    VALUES ('USD', 'JPY', $1)
  `, [rate]);
}

module.exports = {
  pool,
  testConnection,
  initializeSchema,
  query,
  transaction,
  getProducts,
  getProductDetail,
  savePriceHistory,
  getLatestExchangeRate,
  saveExchangeRate
};
