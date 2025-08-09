#!/usr/bin/env node

require('dotenv').config({ path: './.env.local' });
const { supabase } = require('../lib/supabase');

async function checkData() {
  console.log('🔍 データベースの内容を確認中...');
  
  try {
    // 商品データを確認
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(5);
    
    if (productsError) {
      console.error('❌ 商品データ取得エラー:', productsError);
      return;
    }
    
    console.log(`\n📦 商品データ (${products.length}件):`);
    products.forEach(product => {
      console.log(`- ID: ${product.id}, SKU: ${product.sku}, 名前: ${product.name}`);
    });
    
    // 価格履歴データを確認
    const { data: prices, error: pricesError } = await supabase
      .from('price_history')
      .select('*')
      .limit(5);
    
    if (pricesError) {
      console.error('❌ 価格履歴取得エラー:', pricesError);
      return;
    }
    
    console.log(`\n💰 価格履歴データ (${prices.length}件):`);
    prices.forEach(price => {
      console.log(`- ID: ${price.id}, 商品ID: ${price.product_id}, StockX: $${price.stockx_lowest_ask}, 利益: ¥${price.net_profit}`);
    });
    
    // 商品と価格履歴の結合データを確認
    const { data: combined, error: combinedError } = await supabase
      .from('products')
      .select(`
        *,
        price_history(
          stockx_lowest_ask,
          net_profit,
          profit_rate
        )
      `)
      .eq('is_active', true)
      .limit(3);
    
    if (combinedError) {
      console.error('❌ 結合データ取得エラー:', combinedError);
      return;
    }
    
    console.log(`\n🔗 結合データ (${combined.length}件):`);
    combined.forEach(product => {
      console.log(`- ${product.name}:`);
      if (product.price_history && product.price_history.length > 0) {
        product.price_history.forEach(price => {
          console.log(`  StockX: $${price.stockx_lowest_ask}, 利益: ¥${price.net_profit}, 利益率: ${price.profit_rate}%`);
        });
      } else {
        console.log(`  価格データなし`);
      }
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkData();
