const axios = require('axios');

async function testAPI() {
  console.log('🔍 API応答をテスト中...\n');
  
  try {
    // 商品APIをテスト
    const response = await axios.get('http://localhost:3000/api/products/?brand=all&category=all&minProfit=1000&size=all&popularOnly=true&inStockOnly=false&sortBy=popularity&limit=100');
    
    console.log('✅ API応答成功');
    console.log(`📊 商品数: ${response.data.length}件\n`);
    
    // 最新の10件を表示
    console.log('📋 最新の商品（API応答）:');
    response.data.slice(0, 10).forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.sku})`);
      console.log(`   ブランド: ${product.brand}`);
      
      if (product.price_history && product.price_history.length > 0) {
        const latestPrice = product.price_history[0];
        console.log(`   StockX: $${latestPrice.stockx_lowest_ask || 'N/A'}`);
        console.log(`   利益: ¥${latestPrice.net_profit || 'N/A'}`);
        console.log(`   利益率: ${latestPrice.profit_rate || 'N/A'}%`);
      } else {
        console.log(`   価格データ: なし`);
      }
      console.log('');
    });
    
    // ASICS商品を検索
    const asicsProducts = response.data.filter(p => p.brand === 'ASICS');
    console.log(`🔍 ASICS商品（API）: ${asicsProducts.length}件`);
    asicsProducts.forEach(product => {
      console.log(`   - ${product.name} (${product.sku})`);
    });
    
    // Jordan商品を検索
    const jordanProducts = response.data.filter(p => p.brand === 'Jordan');
    console.log(`\n🔍 Jordan商品（API）: ${jordanProducts.length}件`);
    jordanProducts.forEach(product => {
      console.log(`   - ${product.name} (${product.sku})`);
    });
    
  } catch (error) {
    console.error('❌ APIテストエラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

testAPI();
