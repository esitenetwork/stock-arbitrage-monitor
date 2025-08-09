const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function simpleScrape() {
  let browser = null;
  
  try {
    console.log('🚀 ブラウザを起動中...');
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    
    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📍 StockXにアクセス中...');
    await page.goto('https://stockx.com/category/sneakers?sort=most-active', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ ページ読み込み完了、商品データを抽出中...');
    
    // 商品データを抽出
    const products = await page.evaluate(() => {
      const items = [];
      
      // 商品リンクを探す
      const links = document.querySelectorAll('a[href*="/sneakers/"]');
      console.log(`Found ${links.length} sneaker links`);
      
      links.forEach((link, index) => {
        if (index >= 20) return; // 最初の20個だけ
        
        try {
          const href = link.href;
          const text = link.textContent || '';
          
          // SKUを抽出
          const skuMatch = href.match(/\/([^\/]+)$/);
          const sku = skuMatch ? skuMatch[1] : 'N/A';
          
          // 商品名を抽出
          const name = text.trim() || 'N/A';
          
          if (name !== 'N/A' && sku !== 'N/A') {
            items.push({
              index: index + 1,
              name: name,
              sku: sku,
              link: href
            });
          }
        } catch (e) {
          console.error('Link processing error:', e);
        }
      });
      
      return items;
    });

    console.log(`✅ ${products.length}個の商品を取得しました`);
    
    // 結果を保存
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `simple-scrape-${timestamp}.json`;
    await fs.writeFile(filename, JSON.stringify(products, null, 2));
    console.log(`💾 データを ${filename} に保存しました`);

    // 結果を表示
    console.log('\n=== 取得した商品 ===\n');
    products.forEach(product => {
      console.log(`${product.index}. ${product.name}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   リンク: ${product.link}`);
      console.log('');
    });

    return products;

  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 ブラウザを閉じました');
    }
  }
}

// 実行
if (require.main === module) {
  simpleScrape().catch(console.error);
}

module.exports = { simpleScrape };
