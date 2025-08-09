#!/usr/bin/env node

require('dotenv').config({ path: './.env.local' });
const { supabase } = require('../lib/supabase');

// サンプル価格データ
const samplePrices = [
  {
    product_id: 1,
    size_id: 1,
    stockx_lowest_ask: 120.00,
    stockx_highest_bid: 110.00,
    stockx_last_sale: 115.00,
    snkrdunk_price: 18000,
    mercari_price: 17500,
    yahoo_price: 18500,
    rakuten_price: 19000,
    japan_lowest_price: 17500,
    japan_lowest_source: 'メルカリ',
    exchange_rate: 147.68,
    revenue_jpy: 17721.60,
    stockx_fee: 1683.55,
    shipping_cost: 2215.20,
    customs_duty: 1772.16,
    domestic_shipping: 1000,
    net_profit: 11050.69,
    profit_rate: 63.1,
    is_profitable: true
  },
  {
    product_id: 2,
    size_id: 1,
    stockx_lowest_ask: 180.00,
    stockx_highest_bid: 170.00,
    stockx_last_sale: 175.00,
    snkrdunk_price: 28000,
    mercari_price: 27500,
    yahoo_price: 28500,
    rakuten_price: 29000,
    japan_lowest_price: 27500,
    japan_lowest_source: 'メルカリ',
    exchange_rate: 147.68,
    revenue_jpy: 26582.40,
    stockx_fee: 2525.33,
    shipping_cost: 2215.20,
    customs_duty: 2658.24,
    domestic_shipping: 1000,
    net_profit: 18183.63,
    profit_rate: 66.1,
    is_profitable: true
  },
  {
    product_id: 3,
    size_id: 1,
    stockx_lowest_ask: 250.00,
    stockx_highest_bid: 240.00,
    stockx_last_sale: 245.00,
    snkrdunk_price: 38000,
    mercari_price: 37500,
    yahoo_price: 38500,
    rakuten_price: 39000,
    japan_lowest_price: 37500,
    japan_lowest_source: 'メルカリ',
    exchange_rate: 147.68,
    revenue_jpy: 36920.00,
    stockx_fee: 3507.40,
    shipping_cost: 2215.20,
    customs_duty: 3692.00,
    domestic_shipping: 1000,
    net_profit: 27505.40,
    profit_rate: 73.3,
    is_profitable: true
  }
];

async function addSamplePrices() {
  console.log('📊 サンプル価格データを追加中...');
  
  try {
    for (const priceData of samplePrices) {
      const { data, error } = await supabase
        .from('price_history')
        .insert(priceData)
        .select('id');
      
      if (error) {
        console.error('❌ 価格データ追加エラー:', error);
        continue;
      }
      
      console.log(`✓ 価格データ追加完了: ID ${data[0].id}`);
    }
    
    console.log('✅ サンプル価格データ追加完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

addSamplePrices();
