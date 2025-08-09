const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const axios = require('axios');

class StockXScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('ブラウザを起動中...');
    this.browser = await puppeteer.launch({
      headless: false, // デバッグ用にブラウザを可視化
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
    console.log('ブラウザが起動しました');
    
    this.page = await this.browser.newPage();
    console.log('新しいページを作成しました');
    
    // より一般的なUser-Agentに変更
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
    console.log('User-Agentを設定しました');
    
    await this.page.setViewport({ width: 1920, height: 1080 });
    console.log('ビューポートを設定しました');

    // Cookieを毎回クリアしてクリーンな状態で開始
    const client = await this.page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    console.log('Cookieをクリアしました');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
  
  // 人間らしいランダムな待機を生成するヘルパー関数
  randomWait(min = 1000, max = 3000) {
    return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
  }

  // Press & Holdを処理する独立した関数
  async handleCaptcha() {
    try {
      console.log('Captchaの有無を確認中...');
      const iframeSelector = 'iframe[src*="captcha"]';
      // タイムアウトを短くして、存在しない場合の待ち時間を減らす
      await this.page.waitForSelector(iframeSelector, { timeout: 7000 });
      console.log('Captcha iframeを検出。自動処理を開始します。');

      const iframeElement = await this.page.$(iframeSelector);
      const frame = await iframeElement.contentFrame();
      if (!frame) return;

      const buttonSelector = '#px-captcha';
      await frame.waitForSelector(buttonSelector, { visible: true, timeout: 5000 });
      
      // ボタンの座標を取得してクリック
      const rect = await frame.evaluate(selector => {
        const element = document.querySelector(selector);
        const {x, y, width, height} = element.getBoundingClientRect();
        return {x, y, width, height};
      }, buttonSelector);

      if (rect) {
          // マウスを自然に動かす
          await this.page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, {steps: 10});
          await this.page.mouse.down();
          await this.randomWait(1500, 2500); // ランダムな時間ホールド
          await this.page.mouse.up();
          console.log('Press & Hold 処理を完了しました。');
      }
      await this.randomWait(3000, 5000); // ページ遷移を待つ
    } catch (error) {
        console.log('Captchaは表示されませんでした。');
    }
  }


  async scrapeStockXPrice(sku) {
    try {
      const url = `https://stockx.com/search?s=${encodeURIComponent(sku)}`;
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // 最終防衛ライン
      // まずCaptchaを処理
      await this.handleCaptcha();

      // ターゲットの要素（商品カード）が表示されるか確認
      const productCardSelector = '[data-testid="product-card"]';
      try {
        await this.page.waitForSelector(productCardSelector, { timeout: 10000 });
      } catch (e) {
        // それでもダメなら、再度Captcha処理を試みる
        console.log('商品カードが見つかりません。再度Captcha処理を試みます。');
        await this.handleCaptcha();
        await this.page.waitForSelector(productCardSelector, { timeout: 15000 });
      }
      
      // 人間らしい操作を模倣
      await this.page.hover(productCardSelector);
      await this.randomWait(200, 500);
      await this.page.click(productCardSelector);
      
      await this.page.waitForSelector('[data-testid="bid-ask"]', { timeout: 15000 });
      
      const priceData = await this.page.evaluate(() => {
        const parseValue = (text) => text ? parseFloat(text.replace(/[^0-9.]/g, '')) : null;
        const lowestAsk = document.querySelector('[data-testid="lowest-ask"]')?.textContent;
        const highestBid = document.querySelector('[data-testid="highest-bid"]')?.textContent;
        const lastSale = document.querySelector('[data-testid="last-sale"]')?.textContent;
        return {
          lowestAsk: parseValue(lowestAsk),
          highestBid: parseValue(highestBid),
          lastSale: parseValue(lastSale)
        };
      });
      
      return priceData;

    } catch (error) {
      console.error(`StockX価格取得エラー (${sku}):`, error.message);
      const screenshotPath = `error_screenshot_${sku}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`エラー発生時のスクリーンショットを '${screenshotPath}' に保存しました。`);
      return { lowestAsk: null, highestBid: null, lastSale: null };
    }
  }

  async scrapeStockXTopModels() {
    try {
      console.log('StockX Top Modelsページから商品を取得中...');
      
      const url = 'https://stockx.com/category/sneakers?sort=most-active';
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // 最終防衛ライン
      // まずCaptchaを処理
      await this.handleCaptcha();

      // 人間らしいスクロール
      await this.humanScroll();
      
      // ページ情報を確認
      const pageInfo = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyText: document.body.textContent.substring(0, 200)
        };
      });
      
      console.log('ページ情報:', pageInfo);
      
      // 商品リストを取得
      const products = await this.page.evaluate(() => {
        const productList = [];
        
        // 商品カードを探す
        const selectors = [
          '[data-testid="ProductTile"]',
          'a[data-component="product-tile"]',
          'div[data-testid="product-tile"]',
          'a[href*="/sneakers/"]'
        ];
        
        console.log('セレクター検索開始...');
        let foundElements = [];
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`  ${selector}: ${elements.length}個の要素を発見`);
          if (elements.length > 0) {
            foundElements = Array.from(elements);
            console.log(`使用するセレクター: ${selector}`);
            break;
          }
        }
        
        console.log(`合計: ${foundElements.length}個の要素を処理`);
        
        foundElements.forEach((element, index) => {
          try {
            // 商品名
            const titleElement = element.querySelector('[data-testid="product-tile-title"]') || 
                                element.querySelector('h3') || 
                                element.querySelector('h2');
            const name = titleElement ? titleElement.textContent.trim() : '';
            
            // 価格
            const priceElement = element.querySelector('[data-testid="product-tile-lowest-ask-amount"]') ||
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
            }
          } catch (e) {
            console.error(`商品${index + 1}の処理エラー:`, e);
          }
        });
        
        return productList;
      });
      
      console.log(`${products.length}個の商品を取得しました`);
      return products;
      
    } catch (error) {
      console.error('StockX商品リスト取得エラー:', error.message);
      return [];
    }
  }

  async scrapeStockXPrices(skus) {
    const results = [];
    
    for (const sku of skus) {
      console.log(`${sku} の価格を取得中...`);
      const priceData = await this.scrapeStockXPrice(sku);
      results.push({ sku, ...priceData });
      
      // リクエスト間隔を空ける
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    }
    
    return results;
  }

  async humanScroll() {
    await this.page.evaluate(() => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollSteps = Math.floor(scrollHeight / viewportHeight);
      
      for (let i = 0; i < scrollSteps; i++) {
        setTimeout(() => {
          window.scrollTo(0, (i + 1) * viewportHeight);
        }, i * 500);
      }
    });
    
    await this.randomWait(2000, 4000);
  }
}

class JapanSiteScraper {
  async scrapeSnkrdunk(sku) {
    try {
      const response = await axios.get(`https://snkrdunk.com/v1/sneakers/${sku}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.data && response.data.data) {
        const product = response.data.data;
        return {
          name: product.name,
          price: product.lowest_price,
          url: `https://snkrdunk.com/sneakers/${sku}`
        };
      }
    } catch (error) {
      console.error(`SNKRDUNK取得エラー (${sku}):`, error.message);
    }
    
    return null;
  }

  async scrapeMercari(sku) {
    try {
      const response = await axios.get(`https://api.mercari.jp/v2/items?keyword=${encodeURIComponent(sku)}&limit=1`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const item = response.data.data[0];
        return {
          name: item.name,
          price: item.price,
          url: `https://jp.mercari.com/item/${item.id}`
        };
      }
    } catch (error) {
      console.error(`メルカリ取得エラー (${sku}):`, error.message);
    }
    
    return null;
  }

  async scrapeAllJapanSites(sku, rakutenApiKey = null) {
    const results = {
      snkrdunk: null,
      mercari: null,
      rakuten: null
    };
    
    // SNKRDUNK
    results.snkrdunk = await this.scrapeSnkrdunk(sku);
    
    // メルカリ
    results.mercari = await this.scrapeMercari(sku);
    
    // 楽天（APIキーがある場合）
    if (rakutenApiKey) {
      try {
        const response = await axios.get(`https://app.rakuten.co.jp/services/api/Product/Search/20170426?applicationId=${rakutenApiKey}&keyword=${encodeURIComponent(sku)}&hits=1`);
        
        if (response.data && response.data.Items && response.data.Items.length > 0) {
          const item = response.data.Items[0].Item;
          results.rakuten = {
            name: item.itemName,
            price: item.itemPrice,
            url: item.itemUrl
          };
        }
      } catch (error) {
        console.error(`楽天取得エラー (${sku}):`, error.message);
      }
    }
    
    return results;
  }
}

async function getExchangeRate() {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    return response.data.rates.JPY;
  } catch (error) {
    console.error('為替レート取得エラー:', error.message);
    return 150; // フォールバック値
  }
}

module.exports = {
  StockXScraper,
  JapanSiteScraper,
  getExchangeRate
};