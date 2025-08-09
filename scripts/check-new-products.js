require('dotenv').config({ path: './.env.local' });
const { supabase } = require('../lib/supabase');

async function checkNewProducts() {
  console.log('🔍 新しく保存された商品を確認中...\n');
  
  // 全商品を取得
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ 商品取得エラー:', error);
    return;
  }
  
  console.log(`📦 全商品数: ${products.length}件\n`);
  
  // 最新の10件を表示
  console.log('📋 最新の商品（作成日順）:');
  products.slice(0, 10).forEach((product, index) => {
    console.log(`${index + 1}. ${product.name} (${product.sku})`);
    console.log(`   ブランド: ${product.brand}, 作成日: ${product.created_at}`);
    console.log('');
  });
  
  // ASICS商品を検索
  const asicsProducts = products.filter(p => p.brand === 'ASICS');
  console.log(`🔍 ASICS商品: ${asicsProducts.length}件`);
  asicsProducts.forEach(product => {
    console.log(`   - ${product.name} (${product.sku})`);
  });
  
  // Jordan商品を検索
  const jordanProducts = products.filter(p => p.brand === 'Jordan');
  console.log(`\n🔍 Jordan商品: ${jordanProducts.length}件`);
  jordanProducts.forEach(product => {
    console.log(`   - ${product.name} (${product.sku})`);
  });
  
  // 価格履歴も確認
  console.log('\n💰 価格履歴の確認:');
  const { data: priceHistory, error: phError } = await supabase
    .from('price_history')
    .select('product_id, stockx_lowest_ask, net_profit, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(10);
  
  if (phError) {
    console.error('❌ 価格履歴取得エラー:', phError);
    return;
  }
  
  console.log(`📊 最新の価格履歴: ${priceHistory.length}件`);
  priceHistory.forEach((ph, index) => {
    console.log(`${index + 1}. 商品ID: ${ph.product_id}, StockX: $${ph.stockx_lowest_ask}, 利益: ¥${ph.net_profit}, 日時: ${ph.recorded_at}`);
  });
}

checkNewProducts().catch(console.error);
