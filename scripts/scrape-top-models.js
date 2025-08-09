const puppeteer = require('puppeteer');
const fs = require('fs').promises;

/**
 * StockX Top Models (Most Active) ページのスクレイピング
 */
class StockXTopModelsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    try {
      console.log('🚀 ブラウザを起動中...');
      this.browser = await puppeteer.launch({
        headless: false, // デバッグ用にブラウザを表示
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-extensions',
          '--no-default-browser-check',
          '--disable-default-apps'
        ]
      });

      this.page = await this.browser.newPage();

      // ボット検出を回避するための設定
      await this.page.evaluateOnNewDocument(() => {
        // webdriverプロパティを削除
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // その他のボット検出プロパティを無効化
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
        
        // Chromeの自動化フラグを削除
        delete window.chrome;
        
        // その他の検出を回避
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      // より自然なUser-Agentを設定
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // ビューポート設定
      await this.page.setViewport({ width: 1920, height: 1080 });

      // 追加のヘッダー設定
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      console.log('✅ ブラウザ起動完了');
    } catch (error) {
      console.error('❌ ブラウザ起動エラー:', error);
      throw error;
    }
  }

  async scrapeTopModels() {
    try {
      const url = 'https://stockx.com/category/sneakers?sort=most-active';
      console.log(`📍 アクセス中: ${url}`);

      // ページに移動
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // ページの読み込みを待つ
      console.log('⏳ ページ読み込み中...');
      await this.page.waitForTimeout(5000);
      
      // Cloudflareボット検証を待機
      console.log('🔍 ボット検証をチェック中...');
      await this.waitForCloudflare();
      
      // 人間らしい動作をシミュレート
      await this.page.evaluate(() => {
        window.scrollTo(0, 500);
      });
      await this.page.waitForTimeout(2000);
      
      await this.page.evaluate(() => {
        window.scrollTo(0, 1000);
      });
      await this.page.waitForTimeout(2000);
      
      // 商品カードが表示されるまで待機（複数の可能性のあるセレクターを試す）
      const possibleSelectors = [
        '[data-testid="product-tile"]',
        '[data-testid="product-card"]',
        '.css-1ibvugw-TileWrapper',
        '.tile-wrapper',
        'div[class*="TileWrapper"]',
        'div[class*="ProductTile"]',
        'a[href*="/sneakers/"]',
        'a[data-component="product-tile"]',
        'div[data-testid="product-tile"]',
        '.css-1ibvugw-GridProductTileLink',
        'a.tile'
      ];

      let productSelector = null;
      for (const selector of possibleSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          productSelector = selector;
          console.log(`✅ セレクター発見: ${selector}`);
          break;
        } catch (e) {
          console.log(`⚠️ セレクター未発見: ${selector}`);
        }
      }

      if (!productSelector) {
        console.log('📸 スクリーンショットを保存中...');
        await this.page.screenshot({ path: 'stockx-debug.png', fullPage: true });
        
        // ページのHTMLを取得してデバッグ
        const html = await this.page.content();
        await fs.writeFile('stockx-debug.html', html);
        console.log('📝 HTMLファイルを保存しました');
        
        // ページの詳細情報をログ出力
        const pageInfo = await this.page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            allLinks: document.querySelectorAll('a').length,
            allDivs: document.querySelectorAll('div').length,
            bodyText: document.body.textContent.substring(0, 500)
          };
        });
        console.log('📄 ページ情報:', pageInfo);
        
        throw new Error('商品要素が見つかりませんでした');
      }

      // スクロールして全商品を読み込む
      await this.autoScroll();

      // 商品データを抽出
      console.log('📊 商品データを抽出中...');
      const products = await this.page.evaluate((selector) => {
        const items = [];
        const productElements = document.querySelectorAll(selector);
        
        console.log(`Found ${productElements.length} elements with selector: ${selector}`);
        
        productElements.forEach((element, index) => {
          // 最初の20個だけ取得（1ページ目相当）
          if (index >= 20) return;
          
          try {
            // 商品名を探す
            const nameSelectors = [
              'p[class*="primary-text"]',
              'div[class*="title"]',
              'div[class*="name"]',
              'p[class*="ProductName"]',
              'h3',
              'h4',
              'p'
            ];
            
            let name = '';
            for (const nameSelector of nameSelectors) {
              const nameElement = element.querySelector(nameSelector);
              if (nameElement && nameElement.textContent.trim()) {
                name = nameElement.textContent.trim();
                break;
              }
            }
            
            // 価格を探す（複数の可能性）
            const priceSelectors = [
              'p[class*="en-us"]',
              'span[class*="price"]',
              'div[class*="price"]',
              'p[class*="Price"]',
              'span:contains("$")',
              'div[class*="price"]'
            ];
            
            let price = '';
            for (const priceSelector of priceSelectors) {
              const priceElement = element.querySelector(priceSelector);
              if (priceElement && priceElement.textContent.includes('$')) {
                price = priceElement.textContent.trim();
                break;
              }
            }
            
            // 商品リンク
            const linkElement = element.querySelector('a') || element;
            const link = linkElement.href || '';
            
            // SKUまたはIDを抽出
            let sku = '';
            if (link) {
              const match = link.match(/\/([^\/]+)$/);
              if (match) sku = match[1];
            }
            
            // その他の情報
            const colorwaySelectors = [
              'p[class*="secondary-text"]',
              'div[class*="colorway"]',
              'p[class*="subtitle"]'
            ];
            
            let colorway = '';
            for (const colorwaySelector of colorwaySelectors) {
              const colorwayElement = element.querySelector(colorwaySelector);
              if (colorwayElement && colorwayElement.textContent.trim()) {
                colorway = colorwayElement.textContent.trim();
                break;
              }
            }
            
            const lowestAsk = element.querySelector('div[class*="lowest-ask"], span[class*="lowest"]')?.textContent.trim() || price;
            const lastSale = element.querySelector('div[class*="last-sale"], span[class*="last"]')?.textContent.trim() || '';
            
            if (name) {
              items.push({
                index: index + 1,
                name,
                sku: sku || 'N/A',
                colorway,
                price: price || lowestAsk || 'N/A',
                lowestAsk,
                lastSale,
                link: link ? `https://stockx.com${link.startsWith('http') ? '' : link}` : ''
              });
            }
          } catch (err) {
            console.error('商品データ抽出エラー:', err);
          }
        });
        
        return items;
      }, productSelector);

      console.log(`✅ ${products.length}個の商品を取得しました`);
      
      // 結果をJSON形式で保存
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `stockx-top-models-${timestamp}.json`;
      await fs.writeFile(filename, JSON.stringify(products, null, 2));
      console.log(`💾 データを ${filename} に保存しました`);

      return products;

    } catch (error) {
      console.error('❌ スクレイピングエラー:', error);
      
      // エラー時のスクリーンショット
      try {
        await this.page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        console.log('📸 エラー時のスクリーンショットを保存しました');
      } catch (e) {
        console.log('スクリーンショット保存失敗');
      }
      
      throw error;
    }
  }

  async autoScroll() {
    try {
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 200;
          const maxScrolls = 5; // 最初のページのみ
          let scrollCount = 0;
          
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            scrollCount++;
            
            if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
              clearInterval(timer);
              resolve();
            }
          }, 300);
        });
      });
      
      // スクロール後の待機
      await this.page.waitForTimeout(2000);
    } catch (error) {
      console.log('スクロールエラー:', error);
    }
  }

  async waitForCloudflare() {
    try {
      console.log('⏳ Cloudflare検証を待機中...');
      
      // 最大60秒間待機
      const maxWaitTime = 60000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        // ボット検証の要素をチェック
        const hasCloudflare = await this.page.evaluate(() => {
          const selectors = [
            'div[class*="cf-"]',
            'div[id*="cf-"]',
            'div[class*="challenge"]',
            'div[class*="verification"]',
            'iframe[src*="cloudflare"]',
            'div:contains("bot")',
            'div:contains("verification")',
            'div:contains("challenge")'
          ];
          
          for (const selector of selectors) {
            if (document.querySelector(selector)) {
              return true;
            }
          }
          
          // テキストベースの検索
          const bodyText = document.body.textContent.toLowerCase();
          if (bodyText.includes('bot') || 
              bodyText.includes('verification') || 
              bodyText.includes('challenge') ||
              bodyText.includes('cloudflare')) {
            return true;
          }
          
          return false;
        });
        
        if (!hasCloudflare) {
          console.log('✅ Cloudflare検証完了');
          return;
        }
        
        console.log('⏳ まだ検証中... 5秒待機');
        await this.page.waitForTimeout(5000);
      }
      
      console.log('⚠️ Cloudflare検証がタイムアウトしました');
      
    } catch (error) {
      console.log('Cloudflare検証チェックエラー:', error.message);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 ブラウザを閉じました');
    }
  }
}

// メイン実行関数
async function main() {
  const scraper = new StockXTopModelsScraper();
  
  try {
    await scraper.init();
    const products = await scraper.scrapeTopModels();
    
    // コンソールに結果を表示
    console.log('\n=== StockX Top Models (Most Active) ===\n');
    products.forEach(product => {
      console.log(`${product.index}. ${product.name}`);
      console.log(`   SKU/ID: ${product.sku}`);
      console.log(`   価格: ${product.price}`);
      if (product.colorway) console.log(`   カラー: ${product.colorway}`);
      if (product.link) console.log(`   リンク: ${product.link}`);
      console.log('');
    });
    
    return products;
    
  } catch (error) {
    console.error('実行エラー:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

// スクリプトとして直接実行された場合
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { StockXTopModelsScraper, main };
