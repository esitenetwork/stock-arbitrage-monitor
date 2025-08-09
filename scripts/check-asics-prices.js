require('dotenv').config({ path: './.env.local' });
const { supabase } = require('../lib/supabase');

async function checkAsicsPrices() {
  console.log('🔍 ASICS商品の価格データを確認中...\n');
  
  // ASICS商品を取得
  const { data: asicsProducts, error } = await supabase
    .from('products')
    .select(`
      *,
      price_history(
        stockx_lowest_ask,
        japan_lowest_price,
        net_profit,
        profit_rate,
        recorded_at
      )
    `)
    .eq('brand', 'ASICS')
    .eq('is_active', true);
  
  if (error) {
    console.error('❌ ASICS商品取得エラー:', error);
    return;
  }
  
  console.log(`📦 ASICS商品: ${asicsProducts.length}件\n`);
  
  asicsProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name} (${product.sku})`);
    console.log(`   商品ID: ${product.id}`);
    console.log(`   作成日: ${product.created_at}`);
    
    if (product.price_history && product.price_history.length > 0) {
      console.log(`   💰 価格履歴: ${product.price_history.length}件`);
      product.price_history.forEach((price, pIndex) => {
        console.log(`      ${pIndex + 1}. StockX: $${price.stockx_lowest_ask}, 利益: ¥${price.net_profit}, 利益率: ${price.profit_rate}%, 日時: ${price.recorded_at}`);
      });
    } else {
      console.log(`   ❌ 価格履歴: なし`);
    }
    console.log('');
  });
  
  // 全ASICS商品の価格履歴を確認
  console.log('📊 ASICS商品の価格履歴詳細:');
  const { data: allAsicsPrices, error: priceError } = await supabase
    .from('price_history')
    .select('*')
    .in('product_id', asicsProducts.map(p => p.id))
    .order('recorded_at', { ascending: false });
  
  if (priceError) {
    console.error('❌ 価格履歴取得エラー:', priceError);
    return;
  }
  
  console.log(`💰 価格履歴総数: ${allAsicsPrices.length}件`);
  allAsicsPrices.forEach((price, index) => {
    const product = asicsProducts.find(p => p.id === price.product_id);
    console.log(`${index + 1}. ${product?.name || 'Unknown'}`);
    console.log(`   StockX: $${price.stockx_lowest_ask}, 利益: ¥${price.net_profit}, 利益率: ${price.profit_rate}%`);
    console.log(`   日時: ${price.recorded_at}`);
    console.log('');
  });
}

checkAsicsPrices().catch(console.error);
