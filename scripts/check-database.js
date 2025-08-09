require('dotenv').config({ path: './.env.local' });
const { supabase } = require('../lib/supabase');

async function checkDatabase() {
  console.log('データベース登録状況を確認中...\n');
  
  try {
    // 商品テーブルを確認
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (productsError) {
      console.error('商品テーブル取得エラー:', productsError);
      return;
    }
    
    console.log(`商品数: ${products.length}件`);
    console.log('最新の商品:');
    products.slice(0, 5).forEach(product => {
      console.log(`- ${product.name} (${product.sku}) - ${product.created_at}`);
    });
    
    // 価格履歴テーブルを確認
    const { data: priceHistory, error: priceError } = await supabase
      .from('price_history')
      .select('*, products(name, sku)')
      .order('recorded_at', { ascending: false })
      .limit(10);
    
    if (priceError) {
      console.error('価格履歴テーブル取得エラー:', priceError);
      return;
    }
    
    console.log(`\n価格履歴数: ${priceHistory.length}件`);
    console.log('最新の価格履歴:');
    priceHistory.forEach(record => {
      console.log(`- ${record.products.name} (${record.products.sku})`);
      console.log(`  StockX: $${record.stockx_lowest_ask || 'N/A'}`);
      console.log(`  日本最安: ¥${record.japan_lowest_price || 'N/A'} (${record.japan_lowest_source || 'N/A'})`);
      console.log(`  利益: ¥${record.net_profit || 'N/A'} (${record.profit_rate || 'N/A'}%)`);
      console.log(`  記録日時: ${record.recorded_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('データベース確認エラー:', error.message);
  }
}

checkDatabase().catch(console.error);
