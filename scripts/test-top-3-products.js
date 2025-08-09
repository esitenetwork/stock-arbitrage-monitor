require('dotenv').config({ path: './.env.local' });
const { StockXScraper, JapanSiteScraper, getExchangeRate } = require('../lib/scraper');
const { savePriceHistory, saveExchangeRate, supabase } = require('../lib/supabase');
const { calculateProfit } = require('../lib/profitCalculation');

async function testTop3Products() {
  console.log('StockX Top Modelsページから左上3商品を取得開始...\n');
  
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
    
    // StockX Top Modelsページから商品を取得
    console.log('StockX Top Modelsページから商品を取得中...');
    const topProducts = await stockxScraper.scrapeStockXTopModels();
    
    if (!topProducts || topProducts.length === 0) {
      console.log('商品を取得できませんでした');
      return;
    }
    
    console.log(`取得した商品数: ${topProducts.length}件`);
    
    // 左上から3つの商品を処理
    const productsToProcess = topProducts.slice(0, 3);
    
    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      console.log(`\n${i + 1}番目の商品: ${product.name} (${product.sku}) を処理中...`);
      console.log(`価格: ${product.price}`);
      console.log(`URL: ${product.url}`);
      
      // データベースに商品を保存（存在しない場合）
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('sku', product.sku)
        .eq('is_active', true)
        .limit(1);
      
      let productId;
      if (existingProduct && existingProduct.length > 0) {
        productId = existingProduct[0].id;
        console.log(`既存商品ID: ${productId}`);
      } else {
        // 新商品を保存
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            sku: product.sku,
            name: product.name,
            brand: 'Nike', // 仮設定
            category: 'sneakers',
            is_active: true
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('商品保存エラー:', insertError);
          continue;
        }
        
        productId = newProduct.id;
        console.log(`新商品保存完了 ID: ${productId}`);
      }
      
      // StockX価格取得（詳細）
      console.log('StockX詳細価格取得中...');
      const stockxData = await stockxScraper.scrapeStockXPrice(product.sku);
      
      if (stockxData) {
        console.log(`StockX価格: $${stockxData.lowestAsk} (最低売値)`);
        console.log(`StockX最高入札: $${stockxData.highestBid || 'N/A'}`);
        console.log(`StockX最終売却: $${stockxData.lastSale || 'N/A'}`);
      } else {
        console.log('StockX価格取得失敗');
        continue;
      }
      
      // 日本サイト価格取得
      console.log('日本サイト価格取得中...');
      const japanData = await japanScraper.scrapeAllJapanSites(product.sku);
      
      if (japanData) {
        console.log(`日本最安値: ¥${japanData.lowestPrice || '取得失敗'} (${japanData.lowestSource || 'なし'})`);
        console.log(`スニーカーダンク: ¥${japanData.snkrdunk || 'N/A'}`);
      } else {
        console.log('日本サイト価格取得失敗');
        continue;
      }
      
      // 利益計算
      const profitData = calculateProfit(stockxData, japanData, 'sneakers', exchangeRate);
      
      // 価格履歴保存
      await savePriceHistory({
        productId: productId,
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
      
      // 次の商品まで少し待機
      if (i < productsToProcess.length - 1) {
        console.log('次の商品まで待機中...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log(`\n3商品の処理完了!`);
    console.log(`実行時間: ${Math.floor(duration / 1000)}秒`);
    
  } catch (error) {
    console.error('テストエラー:', error.message);
  } finally {
    await stockxScraper.close();
  }
}

testTop3Products().catch(console.error);
