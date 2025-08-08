#!/usr/bin/env node

require('dotenv').config();
const { StockXScraper, JapanSiteScraper, getExchangeRate } = require('../lib/scraper');
const { 
  savePriceHistory, 
  saveExchangeRate, 
  cleanupOldPriceHistory,
  testConnection 
} = require('../lib/supabase');
const { calculateProfit } = require('../lib/profitCalculation');

// 監視対象商品（人気スニーカー）
const TARGET_PRODUCTS = [
  { sku: 'DD1391-100', name: 'Nike Dunk Low Panda', brand: 'Nike', category: 'sneakers' },
  { sku: '553558-612', name: 'Air Jordan 1 Low OG Bred Toe', brand: 'Nike', category: 'sneakers' },
  { sku: 'CP9366', name: 'Yeezy Boost 350 V2 Cream', brand: 'Adidas', category: 'sneakers' },
  { sku: '315122-111', name: 'Air Force 1 Low White', brand: 'Nike', category: 'sneakers' },
  { sku: 'DD1391-102', name: 'Dunk Low University Blue', brand: 'Nike', category: 'sneakers' },
  { sku: 'BQ6817-100', name: 'Air Jordan 1 High OG White', brand: 'Nike', category: 'sneakers' },
  { sku: '555088-105', name: 'Air Jordan 1 High OG Shadow', brand: 'Nike', category: 'sneakers' },
  { sku: 'CW2288-111', name: 'Air Jordan 1 High OG Chicago', brand: 'Nike', category: 'sneakers' },
  { sku: '555088-001', name: 'Air Jordan 1 High OG Black', brand: 'Nike', category: 'sneakers' },
  { sku: '555088-101', name: 'Air Jordan 1 High OG White', brand: 'Nike', category: 'sneakers' }
];

async function main() {
  const startTime = new Date();
  console.log('🚀 StockX Arbitrage Monitor スクレイピング開始...');
  console.log(`📅 開始時刻: ${startTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  
  // Supabase接続テスト
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Supabase接続に失敗しました');
    process.exit(1);
  }
  
  // 為替レート取得
  console.log('💱 為替レートを取得中...');
  const exchangeRate = await getExchangeRate();
  await saveExchangeRate(exchangeRate);
  console.log(`✓ 為替レート: 1 USD = ¥${exchangeRate.toFixed(2)}`);
  
  // スクレイパー初期化
  const stockxScraper = new StockXScraper();
  const japanScraper = new JapanSiteScraper();
  
  try {
    await stockxScraper.init();
    console.log('✓ StockXスクレイパー初期化完了');
    
    let successCount = 0;
    let errorCount = 0;
    
    // 各商品をスクレイピング
    for (const product of TARGET_PRODUCTS) {
      try {
        console.log(`\n📦 ${product.name} (${product.sku}) を処理中...`);
        
        // StockX価格取得
        const stockxData = await stockxScraper.scrapeStockXPrice(product.sku);
        if (!stockxData) {
          console.log(`⚠️ StockX価格取得失敗: ${product.sku}`);
          continue;
        }
        
        // 日本サイト価格取得
        const japanData = await japanScraper.scrapeAllJapanSites(product.sku);
        if (!japanData) {
          console.log(`⚠️ 日本サイト価格取得失敗: ${product.sku}`);
          continue;
        }
        
        // 利益計算
        const profitData = calculateProfit(stockxData, japanData, product.category, exchangeRate);
        
        // 価格履歴保存
        await savePriceHistory({
          productId: product.id || 1, // 仮のID（実際はDBから取得）
          sizeId: 1, // 仮のサイズID
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
        
        console.log(`✓ 保存完了 - 利益: ¥${profitData.netProfit.toLocaleString()} (${profitData.profitRate.toFixed(1)}%)`);
        successCount++;
        
        // レート制限を避けるため少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ エラー: ${product.sku} - ${error.message}`);
        errorCount++;
      }
    }
    
    // 古い価格履歴を削除（3日以上）
    console.log('\n🧹 古い価格履歴を削除中...');
    await cleanupOldPriceHistory();
    
    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log(`\n✅ スクレイピング完了!`);
    console.log(`📅 終了時刻: ${endTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`⏱️ 実行時間: ${Math.floor(duration / 1000)}秒`);
    console.log(`成功: ${successCount}件, エラー: ${errorCount}件`);
    
  } catch (error) {
    console.error('❌ スクレイピング中にエラーが発生しました:', error);
  } finally {
    await stockxScraper.close();
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
