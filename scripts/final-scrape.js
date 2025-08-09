const puppeteer = require('puppeteer');

async function scrapeStockXTopModels() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // ボット検出回避
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    // ボット検出回避のためのスクリプト
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {},
        }),
      });
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    console.log('StockX Top Modelsページにアクセス中...');
    await page.goto('https://stockx.com/category/sneakers?sort=most-active', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('ページ読み込み完了。15秒待機...');
    await page.waitForTimeout(15000);

    // スクロールしてコンテンツを読み込み
    console.log('ページをスクロール中...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(3000);

    // 正しいセレクターで商品を取得
    console.log('商品データを抽出中...');
    const products = await page.evaluate(() => {
      const productElements = document.querySelectorAll('[data-testid="ProductTile"]');
      const results = [];

      productElements.forEach((element) => {
        try {
          // 商品タイトル
          const titleElement = element.querySelector('[data-testid="product-tile-title"]');
          const title = titleElement ? titleElement.textContent.trim() : '';

          // 価格
          const priceElement = element.querySelector('[data-testid="product-tile-lowest-ask-amount"]');
          const price = priceElement ? priceElement.textContent.trim() : '';

          // 商品リンク
          const linkElement = element.querySelector('[data-testid="productTile-ProductSwitcherLink"]');
          const link = linkElement ? linkElement.href : '';

          // 画像
          const imgElement = element.querySelector('img');
          const imageUrl = imgElement ? imgElement.src : '';

          if (title && link) {
            // SKUをリンクから抽出
            const sku = link.split('/').pop() || '';
            
            results.push({
              name: title,
              sku: sku,
              price: price,
              link: link,
              imageUrl: imageUrl
            });
          }
        } catch (error) {
          console.error('商品要素の処理エラー:', error);
        }
      });

      return results;
    });

    console.log(`✅ ${products.length}個の商品を取得しました`);
    
    if (products.length > 0) {
      console.log('\n=== 取得した商品 ===');
      products.slice(0, 5).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   価格: ${product.price}`);
        console.log(`   リンク: ${product.link}`);
        console.log('');
      });
    }

    return products;

  } catch (error) {
    console.error('❌ スクレイピングエラー:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// スクリプト実行
scrapeStockXTopModels()
  .then(products => {
    console.log(`\n🎯 最終結果: ${products.length}個の商品を取得`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  });
