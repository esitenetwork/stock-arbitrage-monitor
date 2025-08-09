require('dotenv').config({ path: './.env.local' });
const { StockXScraper } = require('../lib/scraper');

async function manualPressHold() {
  console.log('手動Press & Hold対応開始...\n');
  
  const scraper = new StockXScraper();
  
  try {
    await scraper.init();
    console.log('ブラウザ初期化完了');
    
    // まずホームページにアクセスしてセッションを確立
    console.log('StockXホームページにアクセス中...');
    await scraper.page.goto('https://stockx.com', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    console.log('ホームページ読み込み完了');
    console.log('Press & Holdチャレンジが表示されたら、手動で通過してください');
    console.log('チャレンジ完了後、Enterキーを押してください');
    
    // 手動入力を待機
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
    
    // チャレンジが完全に解決されたかチェック
    console.log('チャレンジ解決状況をチェック中...');
    await scraper.page.waitForTimeout(3000);
    
    // チャレンジが残っていないかチェック
    const challengeExists = await scraper.page.evaluate(() => {
      const pxFrame = document.querySelector('#px-captcha iframe');
      const challengeElements = document.querySelectorAll('[data-testid*="challenge"], [class*="challenge"], [id*="challenge"]');
      return pxFrame || challengeElements.length > 0;
    });
    
    if (challengeExists) {
      console.log('⚠️ チャレンジがまだ残っています。再度手動で解決してください');
      console.log('解決後、Enterキーを押してください');
      
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          resolve();
        });
      });
    }
    
    console.log('✅ チャレンジ解決確認完了');
    
    // セッションを確実にするため、少し待機
    await scraper.page.waitForTimeout(2000);
    
    // StockX Top Modelsページにアクセス
    const url = 'https://stockx.com/category/sneakers?sort=most-active';
    console.log(`\n商品ページにアクセス中: ${url}`);
    
    await scraper.page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    console.log('商品ページ読み込み完了');
    
    // 再度チャレンジが表示されていないかチェック
    const newChallengeExists = await scraper.page.evaluate(() => {
      const pxFrame = document.querySelector('#px-captcha iframe');
      const challengeElements = document.querySelectorAll('[data-testid*="challenge"], [class*="challenge"], [id*="challenge"]');
      return pxFrame || challengeElements.length > 0;
    });
    
    if (newChallengeExists) {
      console.log('⚠️ 商品ページでチャレンジが表示されました。手動で解決してください');
      console.log('解決後、Enterキーを押してください');
      
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          resolve();
        });
      });
    }
    
    console.log('手動チャレンジ完了、商品取得を開始...');
    
    // 人間らしい動作をシミュレート
    await scraper.page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await scraper.page.waitForTimeout(2000);
    
    await scraper.page.evaluate(() => {
      window.scrollTo(0, 1000);
    });
    await scraper.page.waitForTimeout(2000);
    
    // 商品リストを取得
    const products = await scraper.page.evaluate(() => {
      console.log('Page title:', document.title);
      console.log('Page URL:', window.location.href);
      
      const productList = [];
      
      // 商品カードを探す（複数のセレクターを試す）
      const selectors = [
        '[data-testid="ProductTile"]',
        'a[data-component="product-tile"]',
        'div[data-testid="product-tile"]',
        '.css-1ibvugw-GridProductTileLink',
        'a.tile',
        'a[href*="/sneakers/"]',
        'a[href*="/shoes/"]'
      ];
      
      let foundElements = [];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          foundElements = Array.from(elements);
          break;
        }
      }
      
      if (foundElements.length === 0) {
        // フォールバック: すべてのリンクをチェック
        const allLinks = document.querySelectorAll('a[href*="/"]');
        console.log(`No product tiles found, checking ${allLinks.length} links`);
        foundElements = Array.from(allLinks);
      }
      
      foundElements.forEach((element, index) => {
        try {
          // 商品名
          const titleElement = element.querySelector('[data-testid="product-tile-title"]') || 
                              element.querySelector('h3') || 
                              element.querySelector('h2') || 
                              element.querySelector('h1');
          const name = titleElement ? titleElement.textContent.trim() : '';
          
          // 価格
          const priceElement = element.querySelector('[data-testid="product-tile-lowest-ask-amount"]') ||
                              element.querySelector('[data-testid*="price"]') ||
                              element.querySelector('.price') ||
                              element.querySelector('[class*="price"]');
          const price = priceElement ? priceElement.textContent.trim() : '';
          
          // 商品リンク
          const url = element.href || '';
          
          // SKUを抽出
          const skuMatch = url.match(/\/([A-Z0-9-]+)$/);
          const sku = skuMatch ? skuMatch[1] : '';
          
          if (name && sku && url.includes('/sneakers/')) {
            productList.push({
              sku: sku,
              name: name,
              price: price,
              url: url,
              index: index
            });
            
            console.log(`商品${index + 1}: ${name} (${sku}) - ${price}`);
          }
        } catch (e) {
          console.error(`商品${index + 1}の処理エラー:`, e);
        }
      });
      
      return productList;
    });
    
    console.log(`\n取得した商品数: ${products.length}件`);
    
    if (products.length > 0) {
      console.log('\n取得した商品:');
      products.slice(0, 10).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.sku}) - ${product.price}`);
      });
    } else {
      console.log('\n⚠️ 商品が見つかりませんでした');
      console.log('ページの内容を確認してください');
    }
    
    console.log('\n手動Press & Holdテスト完了！');
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await scraper.close();
  }
}

manualPressHold().catch(console.error);
