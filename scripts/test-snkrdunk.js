require('dotenv').config({ path: './.env.local' });
const { JapanSiteScraper } = require('../lib/scraper');

async function testSnkrdunk() {
  console.log('🔍 スニーカーダンクスクレイピングテスト開始...\n');
  
  const japanScraper = new JapanSiteScraper();
  
  // テスト用SKU（人気ランキングに含まれている商品）
  const testSkus = [
    'CW2288-111', // ナイキ エアフォース1 ロー '07 "ホワイト/ホワイト"
    'DZ5485-106', // ナイキ エアジョーダン1 レトロ ハイ OG "ブラックトゥリイマジンド"
    'IB6396-200'  // ナイキ ウィメンズ エアマックス95 OG ビッグバブル "ベルベットブラウン"
  ];
  
  for (const sku of testSkus) {
    console.log(`\n📦 テスト商品: ${sku}`);
    try {
      const price = await japanScraper.scrapeSnkrdunk(sku);
      if (price) {
        console.log(`✅ 成功: ¥${price.toLocaleString()}`);
      } else {
        console.log(`❌ 失敗: 価格を取得できませんでした`);
      }
    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
    }
    
    // レート制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎯 テスト完了');
}

testSnkrdunk().catch(console.error);
