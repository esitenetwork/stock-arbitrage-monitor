#!/usr/bin/env node

require('dotenv').config({ path: './.env.local' });
const { StockXScraper, JapanSiteScraper, getExchangeRate } = require('../lib/scraper');
const { 
  savePriceHistory, 
  saveExchangeRate, 
  cleanupOldPriceHistory,
  testConnection,
  supabase
} = require('../lib/supabase');
const { calculateProfit } = require('../lib/profitCalculation');

// 監視対象商品（StockX Top Modelsから自動取得）
let TARGET_PRODUCTS = [];

async function scrapeTopModels() {
  const scraper = new StockXScraper();
  
  try {
    console.log('StockXスクレイパーを初期化中...');
    await scraper.init();
    console.log('StockXスクレイパー初期化完了');
    
    console.log('StockX Top Modelsページにアクセス中...');
    const products = await scraper.scrapeStockXTopModels();
    
    if (products.length > 0) {
      console.log('\n=== 取得した商品 ===');
      products.slice(0, 5).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   価格: ${product.price}`);
        console.log(`   リンク: ${product.url}`);
        console.log('');
      });
    } else {
      console.log('商品を取得できませんでした');
    }

    return products;

  } catch (error) {
    console.error('スクレイピングエラー:', error);
    console.error('エラーの詳細:', error.stack);
    return [];
  } finally {
    console.log('ブラウザを閉じています...');
    await scraper.close();
    console.log('ブラウザを閉じました');
  }
}

async function saveProductToDatabase(product) {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          sku: product.sku,
          name: product.name,
          brand: extractBrand(product.name),
          category: 'sneakers',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      if (error.code === '23505') { // 重複エラー
        console.log(`✓ 商品は既に存在します: ${product.sku}`);
        return true;
      }
      console.error(`❌ 商品保存エラー: ${product.sku} - ${error.message}`);
      return false;
    }

    console.log(`✓ 新商品を保存しました: ${product.name} (${product.sku})`);
    return true;
  } catch (error) {
    console.error(`❌ 商品保存エラー: ${product.sku} - ${error.message}`);
    return false;
  }
}

function extractBrand(productName) {
  const brands = ['Nike', 'Jordan', 'Adidas', 'ASICS', 'New Balance', 'Converse', 'Vans', 'Puma'];
  for (const brand of brands) {
    if (productName.includes(brand)) {
      return brand;
    }
  }
  return 'Other';
}

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
  
  // StockX Top Modelsから商品を取得
  console.log('🔍 StockX Top Modelsから商品を取得中...');
  TARGET_PRODUCTS = await scrapeTopModels();
  
  if (TARGET_PRODUCTS.length === 0) {
    console.log('⚠️ 商品を取得できませんでした。テスト用商品を使用します。');
    TARGET_PRODUCTS = [
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
  }
  
  console.log(`✓ ${TARGET_PRODUCTS.length}件の商品を処理対象に設定`);
  
  // 新商品をデータベースに保存（最初の3件のみテスト）
  console.log('💾 新商品をデータベースに保存中...');
  for (const product of TARGET_PRODUCTS.slice(0, 3)) {
    await saveProductToDatabase(product);
  }
  
  // スクレイパー初期化
  const stockxScraper = new StockXScraper();
  const japanScraper = new JapanSiteScraper();
  
  try {
    console.log('StockXスクレイパーを初期化中...');
    await stockxScraper.init();
    console.log('StockXスクレイパー初期化完了');
    
    let successCount = 0;
    let errorCount = 0;
    
    // データベースから商品IDを取得（新しく保存された商品も含む）
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, sku')
      .eq('is_active', true);
    
    if (dbError) {
      console.error('❌ 商品データ取得エラー:', dbError);
      return;
    }
    
    console.log(`✓ データベースから${dbProducts.length}件の商品を取得`);
    
    // 各商品をスクレイピング（最初の3件のみテスト）
    const productsToProcess = TARGET_PRODUCTS.slice(0, 3);
    
    for (const product of productsToProcess) {
      try {
        console.log(`\n📦 ${product.name} (${product.sku}) を処理中...`);
        
        // データベースから商品IDを取得
        const dbProduct = dbProducts.find(p => p.sku === product.sku);
        if (!dbProduct) {
          console.log(`⚠️ データベースに商品が見つかりません: ${product.sku}`);
          continue;
        }
        
        // StockX価格取得
        const stockxData = await stockxScraper.scrapeStockXPrice(product.sku);
        if (!stockxData) {
          console.log(`⚠️ StockX価格取得失敗: ${product.sku}`);
          continue;
        }
        
        console.log(`✓ StockX価格: $${stockxData.lowestAsk} (最低売値)`);
        
        // 日本サイト価格取得
        const japanData = await japanScraper.scrapeAllJapanSites(product.sku);
        if (!japanData) {
          console.log(`⚠️ 日本サイト価格取得失敗: ${product.sku}`);
          continue;
        }
        
        console.log(`✓ 日本最安値: ¥${japanData.lowestPrice || '取得失敗'} (${japanData.lowestSource || 'なし'})`);
        
        // 利益計算
        const profitData = calculateProfit(stockxData, japanData, product.category || 'sneakers', exchangeRate);
        
        // 価格履歴保存
        await savePriceHistory({
          productId: dbProduct.id, // 実際のデータベースID
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
    console.error('スクレイピング中にエラーが発生しました:', error);
    console.error('エラーの詳細:', error.stack);
  } finally {
    console.log('ブラウザを閉じています...');
    await stockxScraper.close();
    console.log('ブラウザを閉じました');
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
