require('dotenv').config({ path: './.env.local' });
const { StockXScraper } = require('../lib/scraper');

async function testPressAndHold() {
  console.log('🔍 Press & Hold 自動化テスト開始...\n');
  
  const scraper = new StockXScraper();
  
  try {
    // ブラウザ初期化
    await scraper.init();
    console.log('✅ ブラウザ初期化完了');
    
    // StockX Top Modelsページにアクセス（自動化機能付き）
    console.log('\n🌐 StockX Top Modelsページにアクセス中...');
    await scraper.scrapeStockXTopModels();
    
    console.log('\n🎉 テスト完了！Press & Hold自動化が動作しているはずです。');
    console.log('ブラウザを確認して、ボタンが自動で押されているかチェックしてください。');
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
  } finally {
    // ブラウザを閉じる前に少し待機（結果を確認するため）
    console.log('\n⏱️ 10秒後にブラウザを閉じます...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await scraper.close();
  }
}

testPressAndHold().catch(console.error);
