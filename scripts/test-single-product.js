require('dotenv').config({ path: './.env.local' });
const { StockXScraper, JapanSiteScraper, getExchangeRate } = require('../lib/scraper');
const { savePriceHistory, saveExchangeRate, supabase } = require('../lib/supabase');
const { calculateProfit } = require('../lib/profitCalculation');

async function testSingleProduct() {
  console.log('1件の商品でテスト開始...\n');
  
  const startTime = new Date();
  
  // 為替レート取得
  console.log('為替レートを取得中...');
  const exchangeRate = await getExchangeRate();
  await saveExchangeRate(exchangeRate);
  console.log(`為替レート: 1 USD = ¥${exchangeRate.toFixed(2)}`);
  
  // スクレイパー初期化
  const stockxScraper = new StockXScraper();
  const japanScraper = new JapanSiteScraper();
  
  try {
    await stockxScraper.init();
    console.log('StockXスクレイパー初期化完了');
    
    // テスト用商品（1件のみ）
    const testProduct = {
      sku: 'DD1391-100',
      name: 'Nike Dunk Low Panda',
      brand: 'Nike',
      category: 'sneakers'
    };
    
    console.log(`\n商品: ${testProduct.name} (${testProduct.sku}) を処理中...`);
    
    // データベースから商品IDを取得
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, sku')
      .eq('sku', testProduct.sku)
      .eq('is_active', true)
      .limit(1);
    
    if (dbError || !dbProducts || dbProducts.length === 0) {
      console.error('データベースに商品が見つかりません');
      return;
    }
    
    const dbProduct = dbProducts[0];
    console.log(`データベース商品ID: ${dbProduct.id}`);
    
    // StockX価格取得
    console.log('StockX価格取得中...');
    const stockxData = await stockxScraper.scrapeStockXPrice(testProduct.sku);
    
    if (stockxData) {
      console.log(`StockX価格: $${stockxData.lowestAsk} (最低売値)`);
    } else {
      console.log('StockX価格取得失敗');
      return;
    }
    
    // 日本サイト価格取得
    console.log('日本サイト価格取得中...');
    const japanData = await japanScraper.scrapeAllJapanSites(testProduct.sku);
    
    if (japanData) {
      console.log(`日本最安値: ¥${japanData.lowestPrice || '取得失敗'} (${japanData.lowestSource || 'なし'})`);
    } else {
      console.log('日本サイト価格取得失敗');
      return;
    }
    
    // 利益計算
    const profitData = calculateProfit(stockxData, japanData, testProduct.category, exchangeRate);
    
    // 価格履歴保存
    await savePriceHistory({
      productId: dbProduct.id,
      sizeId: 1,
      stockxLowestAsk: stockxData.lowestAsk,
      stockxHighestBid: stockxData.highestBid,
      stockxLastSale: stockxData.lastSale,
      snkrdunkPrice: japanData.snkrdunk,
      mercariPrice: japanData.mercari,
      yahooPrice: japanData.yahoo,
      rakutenPrice: japanData.rakuten,
      japanLowestPrice: japanData.lowestPrice,
      japanLowestSource: japanData.lowestSource,
      exchangeRate: exchangeRate,
      revenueJpy: profitData.revenueJPY,
      stockxFee: profitData.stockxFee,
      shippingCost: profitData.shippingCost,
      customsDuty: profitData.customsDuty,
      domesticShipping: profitData.domesticShipping,
      netProfit: profitData.netProfit,
      profitRate: profitData.profitRate,
      isProfitable: profitData.isProfitable
    });
    
    console.log(`保存完了 - 利益: ¥${profitData.netProfit.toLocaleString()} (${profitData.profitRate.toFixed(1)}%)`);
    
    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log(`\nテスト完了!`);
    console.log(`実行時間: ${Math.floor(duration / 1000)}秒`);
    
  } catch (error) {
    console.error('テストエラー:', error.message);
  } finally {
    await stockxScraper.close();
  }
}

testSingleProduct().catch(console.error);
