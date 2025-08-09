const puppeteer = require('puppeteer');
const axios = require('axios');

class StockXScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false, // ブラウザを表示する
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-data-dir=./chrome-user-data' // セッション保持用
      ]
    });
    this.page = await this.browser.newPage();
    
    // ボット検出を回避するための設定
    await this.page.evaluateOnNewDocument(() => {
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
      
      // 追加のボット検出回避
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });
    
    // より詳細なUser-Agent設定
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // ビューポートを設定
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // 追加のヘッダー設定
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });
    
    // クッキーとローカルストレージの保持
    await this.page.setCacheEnabled(true);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Press & Hold ボタンを自動化する
   */
  async handlePressAndHold() {
    try {
      console.log('🔍 Press & Hold ボタンを探しています...');
      
      // より詳細なチャレンジ検出
      const challengeDetected = await this.page.evaluate(() => {
        // PerimeterX iframe
        const pxFrame = document.querySelector('#px-captcha iframe');
        const pxCaptcha = document.querySelector('#px-captcha');
        
        // その他のチャレンジ要素
        const challengeElements = document.querySelectorAll([
          '[data-testid*="challenge"]',
          '[class*="challenge"]',
          '[id*="challenge"]',
          '[class*="captcha"]',
          '[id*="captcha"]',
          '[class*="verification"]',
          '[id*="verification"]',
          '[class*="bot"]',
          '[id*="bot"]',
          '[class*="security"]',
          '[id*="security"]'
        ].join(','));
        
        // Press & Hold ボタン
        const pressHoldButtons = document.querySelectorAll([
          'button:contains("Press")',
          'button:contains("Hold")',
          'div[role="button"]:contains("Press")',
          'div[role="button"]:contains("Hold")',
          '[class*="press"]',
          '[class*="hold"]'
        ].join(','));
        
        return {
          hasPxFrame: !!pxFrame,
          hasPxCaptcha: !!pxCaptcha,
          challengeCount: challengeElements.length,
          pressHoldCount: pressHoldButtons.length,
          hasAnyChallenge: !!(pxFrame || pxCaptcha || challengeElements.length > 0 || pressHoldButtons.length > 0)
        };
      });
      
      console.log('チャレンジ検出結果:', challengeDetected);
      
      if (!challengeDetected.hasAnyChallenge) {
        console.log('✅ チャレンジは検出されませんでした');
        return true;
      }
      
      // PerimeterX iframeをチェック
      const pxFrame = await this.page.$('#px-captcha iframe');
      if (pxFrame) {
        console.log('✅ PerimeterX iframe発見、処理中...');
        
        try {
          // iframe内のコンテンツにアクセス
          const frameElement = await this.page.$('#px-captcha iframe');
          const frame = await frameElement.contentFrame();
          
          if (frame) {
            console.log('🔄 iframe内のコンテンツにアクセス成功');
            
            // iframe内のボタンを探す
            const frameButtons = await frame.$$('button, div[role="button"], div[onclick]');
            console.log(`🔍 iframe内のボタン数: ${frameButtons.length}`);
            
            for (let i = 0; i < frameButtons.length; i++) {
              const button = frameButtons[i];
              const buttonText = await frame.evaluate(el => el.textContent, button);
              console.log(`ボタン${i + 1}: "${buttonText}"`);
              
              if (buttonText.toLowerCase().includes('press') || 
                  buttonText.toLowerCase().includes('hold') ||
                  buttonText.toLowerCase().includes('verify')) {
                
                console.log(`🎯 Press & Hold ボタン発見: "${buttonText}"`);
                
                // ボタンをクリックしてから長押し
                await button.click();
                await this.page.waitForTimeout(100);
                
                // マウスダウン
                await button.hover();
                await this.page.mouse.down();
                
                // 長押し（3秒）
                console.log('⏳ Press & Hold 実行中...');
                await this.page.waitForTimeout(3000);
                
                // マウスアップ
                await this.page.mouse.up();
                
                console.log('✅ Press & Hold 完了');
                
                // 結果を待機
                await this.page.waitForTimeout(5000);
                
                // チャレンジが解決されたかチェック
                const resolved = await this.checkChallengeResolved();
                if (resolved) {
                  console.log('✅ チャレンジ解決確認');
                  return true;
                } else {
                  console.log('⚠️ チャレンジ解決未確認、再試行...');
                }
              }
            }
          }
        } catch (error) {
          console.error('iframe処理エラー:', error.message);
        }
      }
      
      // その他のチャレンジ要素をチェック
      const otherButtons = await this.page.$$('button, div[role="button"], div[onclick]');
      console.log(`🔍 その他のボタン数: ${otherButtons.length}`);
      
      for (let i = 0; i < otherButtons.length; i++) {
        const button = otherButtons[i];
        const buttonText = await this.page.evaluate(el => el.textContent, button);
        
        if (buttonText.toLowerCase().includes('press') || 
            buttonText.toLowerCase().includes('hold') ||
            buttonText.toLowerCase().includes('verify')) {
          
          console.log(`🎯 チャレンジボタン発見: "${buttonText}"`);
          
          try {
            await button.click();
            await this.page.waitForTimeout(3000);
            
            const resolved = await this.checkChallengeResolved();
            if (resolved) {
              console.log('✅ チャレンジ解決確認');
              return true;
            }
          } catch (error) {
            console.error(`ボタン${i + 1}クリックエラー:`, error.message);
          }
        }
      }
      
      console.log('⚠️ チャレンジ解決できませんでした');
      return false;
      
    } catch (error) {
      console.error('Press & Hold 処理エラー:', error.message);
      return false;
    }
  }

  /**
   * チャレンジが解決されたかチェック
   */
  async checkChallengeResolved() {
    try {
      const result = await this.page.evaluate(() => {
        // チャレンジ要素が残っているかチェック
        const pxFrame = document.querySelector('#px-captcha iframe');
        const pxCaptcha = document.querySelector('#px-captcha');
        const challengeElements = document.querySelectorAll([
          '[data-testid*="challenge"]',
          '[class*="challenge"]',
          '[id*="challenge"]',
          '[class*="captcha"]',
          '[id*="captcha"]',
          '[class*="verification"]',
          '[id*="verification"]'
        ].join(','));
        
        // ページが正常に読み込まれているかチェック
        const hasContent = document.body && document.body.children.length > 0;
        const hasTitle = document.title && document.title.length > 0;
        const hasLinks = document.querySelectorAll('a').length > 0;
        
        return {
          hasChallenge: !!(pxFrame || pxCaptcha || challengeElements.length > 0),
          hasContent,
          hasTitle,
          hasLinks,
          isResolved: !(pxFrame || pxCaptcha || challengeElements.length > 0) && hasContent && hasTitle
        };
      });
      
      console.log('チャレンジ解決チェック結果:', result);
      return result.isResolved;
      
    } catch (error) {
      console.error('チャレンジ解決チェックエラー:', error.message);
      return false;
    }
  }

  /**
   * ページの読み込みとボット検出チャレンジの処理
   */
  async loadPageWithBotDetection(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 ページ読み込み試行 ${attempt}/${maxRetries}: ${url}`);
        
        await this.page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        });
        
        // ページロード待機
        await this.page.waitForTimeout(5000);
        
        // チャレンジが表示されているかチェック
        const hasChallenge = await this.page.evaluate(() => {
          const pxFrame = document.querySelector('#px-captcha iframe');
          const pxCaptcha = document.querySelector('#px-captcha');
          const challengeElements = document.querySelectorAll([
            '[data-testid*="challenge"]',
            '[class*="challenge"]',
            '[id*="challenge"]',
            '[class*="captcha"]',
            '[id*="captcha"]',
            '[class*="verification"]',
            '[id*="verification"]'
          ].join(','));
          
          return !!(pxFrame || pxCaptcha || challengeElements.length > 0);
        });
        
        if (hasChallenge) {
          console.log('🔍 チャレンジ検出、処理開始...');
          
          // Press & Hold チャレンジを処理
          const challengeHandled = await this.handlePressAndHold();
          
          if (challengeHandled) {
            // チャレンジ解決後の確認
            await this.page.waitForTimeout(3000);
            
            const finalCheck = await this.checkChallengeResolved();
            if (finalCheck) {
              console.log('✅ ページ読み込み完了（チャレンジ解決済み）');
              return true;
            } else {
              console.log(`⚠️ 試行 ${attempt} 失敗（チャレンジ解決未確認）、再試行...`);
              await this.page.waitForTimeout(2000);
            }
          } else {
            console.log(`⚠️ 試行 ${attempt} 失敗（チャレンジ処理失敗）、再試行...`);
            await this.page.waitForTimeout(2000);
          }
        } else {
          // チャレンジがない場合、ページが正常に読み込まれているかチェック
          const pageLoaded = await this.page.evaluate(() => {
            return document.body && document.body.children.length > 0 && document.title.length > 0;
          });
          
          if (pageLoaded) {
            console.log('✅ ページ読み込み完了（チャレンジなし）');
            return true;
          } else {
            console.log(`⚠️ 試行 ${attempt} 失敗（ページ読み込み未完了）、再試行...`);
            await this.page.waitForTimeout(2000);
          }
        }
      } catch (error) {
        console.error(`❌ 試行 ${attempt} エラー:`, error.message);
        if (attempt < maxRetries) {
          await this.page.waitForTimeout(3000);
        }
      }
    }
    
    throw new Error(`ページ読み込みに失敗しました（${maxRetries}回試行）`);
  }

  /**
   * StockXのSneakers Top Modelsページから商品リストを取得
   * @returns {Array} 商品リスト
   */
  async scrapeStockXTopModels() {
    try {
      console.log('🔍 StockX Sneakers Top Modelsページから商品を取得中...');
      
      // StockXのSneakers Top Modelsページにアクセス（ボット検出自動化付き）
      const url = 'https://stockx.com/category/sneakers?sort=most-active';
      
      // 新しい自動化機能を使用してページを読み込み
      await this.loadPageWithBotDetection(url);
      
      // 人間らしい動作をシミュレート
      await this.page.evaluate(() => {
        window.scrollTo(0, 500);
      });
      await this.page.waitForTimeout(2000);
      
      await this.page.evaluate(() => {
        window.scrollTo(0, 1000);
      });
      await this.page.waitForTimeout(2000);
      
      // 商品リストを取得
      const products = await this.page.evaluate(() => {
        console.log('Page title:', document.title);
        console.log('Page URL:', window.location.href);
        console.log('All links count:', document.querySelectorAll('a').length);
        
        // すべてのリンクの詳細をログ出力
        const allLinks = document.querySelectorAll('a');
        console.log('First 10 links:');
        for (let i = 0; i < Math.min(10, allLinks.length); i++) {
          const link = allLinks[i];
          console.log(`  ${i + 1}. href: ${link.href}, text: ${link.textContent?.substring(0, 50) || 'N/A'}`);
        }
        
        const productList = [];
        
        // 商品カードを探す（複数のセレクターを試す）
        const selectors = [
          '[data-testid="ProductTile"]', // 画像から確認したセレクター
          'a[data-component="product-tile"]',
          'div[data-testid="product-tile"]',
          '.css-1ibvugw-GridProductTileLink',
          'a.tile',
          'a[href*="/sneakers/"]',
          'a[href*="/shoes/"]',
          'a[href*="/"]', // 商品リンクを含むすべてのリンク
          'a' // すべてのリンク
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            
            // 最初の数件のリンクをログ出力
            for (let i = 0; i < Math.min(3, elements.length); i++) {
              const href = elements[i].href;
              const text = elements[i].textContent || '';
              console.log(`  ${i + 1}. href: ${href}, text: ${text.substring(0, 50)}`);
            }
            
            for (let index = 0; index < elements.length; index++) {
              const element = elements[index];
              try {
                const href = element.href;
                const text = element.textContent || '';
                
                // 商品リンクかどうかを判定
                if (href && href.includes('stockx.com') && 
                    (href.includes('/sneakers/') || href.includes('/shoes/') || href.includes('/'))) {
                  
                  // SKUを抽出（URLから）
                  const skuMatch = href.match(/\/([A-Z0-9-]+)$/);
                  const sku = skuMatch ? skuMatch[1] : null;
                  
                  // 商品名を抽出（data-testid="product-tile-title"から）
                  const titleElement = element.querySelector('[data-testid="product-tile-title"]');
                  const name = titleElement ? titleElement.textContent.trim() : '';
                  
                  // 価格を抽出（data-testid="product-tile-lowest-ask-amount"から）
                  const priceElement = element.querySelector('[data-testid="product-tile-lowest-ask-amount"]');
                  const price = priceElement ? priceElement.textContent.trim() : '';
                  
                  if (sku && name) {
                    productList.push({
                      sku: sku,
                      name: name,
                      price: price,
                      url: href,
                      index: index
                    });
                    
                    console.log(`商品発見: ${name} (${sku}) - ${price}`);
                  }
                }
              } catch (e) {
                // 個別の要素でエラーが発生しても続行
                continue;
              }
            }
            
            // 商品が見つかったらループを抜ける
            if (productList.length > 0) {
              break;
            }
          }
        }
        
        // 重複を除去して最初の20件を返す
        const uniqueProducts = productList.filter((product, index, self) => 
          index === self.findIndex(p => p.sku === product.sku)
        ).slice(0, 20);
        
        console.log(`Found ${uniqueProducts.length} unique products`);
        return uniqueProducts;
      });
      
      console.log(`✅ StockX商品リスト取得成功: ${products.length}件`);
      return products;
      
    } catch (error) {
      console.error('❌ StockX商品リスト取得エラー:', error.message);
      
      // スクリーンショットを保存（デバッグ用）
      try {
        await this.page.screenshot({ 
          path: `stockx-topmodels-error-${Date.now()}.png`,
          fullPage: true 
        });
      } catch (e) {}
      
      return [];
    }
  }

  /**
   * StockXから商品価格を取得（改善版）
   * @param {string} sku - 商品SKU
   * @returns {Object} 価格データ
   */
  async scrapeStockXPrice(sku) {
    try {
      console.log(`🔍 StockX価格取得中: ${sku}`);
      
      // APIエンドポイントを使用する方法（より確実）
      try {
        const apiResponse = await this.getStockXPriceViaAPI(sku);
        if (apiResponse) {
          return apiResponse;
        }
      } catch (apiError) {
        console.log('API方式失敗、スクレイピングに切り替え');
      }
      
      // スクレイピング方式
      const url = `https://stockx.com/search?s=${encodeURIComponent(sku)}`;
      
      // 新しい自動化機能を使用してページを読み込み
      await this.loadPageWithBotDetection(url);
      
      // Press & Holdチャレンジ後に商品カードが表示されるまで待機
      console.log('⏱️ 商品カードの読み込みを待機中...');
      await this.page.waitForTimeout(5000);
      
      // ページをスクロールしてコンテンツを読み込み
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await this.page.waitForTimeout(2000);
      
      // 複数のセレクターを試す（HTML分析に基づく更新版）
      const selectors = {
        productCard: [
          'a[href*="/' + sku.toLowerCase() + '"]',
          'a[href*="/' + sku + '"]',
          'a[data-component="product-tile"]',
          'div[data-testid="product-tile"]',
          '.css-1ibvugw-GridProductTileLink',
          'a.tile'
        ],
        lowestAsk: [
          '[data-testid="product-lowest-ask"]',
          '.stat-value:contains("Lowest Ask")',
          '.lowest-ask',
          'div:contains("Lowest Ask") + div',
          'span:contains("$")',
          'div[class*="price"]'
        ],
        highestBid: [
          '[data-testid="product-highest-bid"]',
          '.stat-value:contains("Highest Bid")',
          '.highest-bid',
          'div:contains("Highest Bid") + div'
        ],
        lastSale: [
          '[data-testid="product-last-sale"]',
          '.stat-value:contains("Last Sale")',
          '.last-sale',
          'div:contains("Last Sale") + div'
        ]
      };
      
      // 商品カードをクリック（HTML分析に基づく改善版）
      let clicked = false;
      
      // まず、SKUを含むリンクを直接探す
      try {
        const productLink = await this.page.evaluate((sku) => {
          const links = document.querySelectorAll('a[href*="/' + sku.toLowerCase() + '"]');
          if (links.length > 0) {
            return links[0].href;
          }
          const links2 = document.querySelectorAll('a[href*="/' + sku + '"]');
          if (links2.length > 0) {
            return links2[0].href;
          }
          return null;
        }, sku);
        
        if (productLink) {
          console.log(`✓ 商品リンク発見: ${productLink}`);
          await this.loadPageWithBotDetection(productLink);
          clicked = true;
        }
      } catch (e) {
        console.log('直接リンク取得失敗、セレクター方式に切り替え');
      }
      
      // 直接リンクが失敗した場合、セレクター方式を試す
      if (!clicked) {
        for (const selector of selectors.productCard) {
          try {
            await this.page.waitForSelector(selector, { timeout: 5000 });
            await this.page.click(selector);
            clicked = true;
            break;
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!clicked) {
        // デバッグ情報を出力
        const debugInfo = await this.page.evaluate(() => {
          const allLinks = document.querySelectorAll('a');
          const allDivs = document.querySelectorAll('div');
          return {
            totalLinks: allLinks.length,
            totalDivs: allDivs.length,
            pageTitle: document.title,
            pageUrl: window.location.href,
            firstLinks: Array.from(allLinks.slice(0, 5)).map(link => ({
              href: link.href,
              text: link.textContent?.substring(0, 50)
            }))
          };
        });
        
        console.log('🔍 デバッグ情報:', debugInfo);
        throw new Error(`商品カードが見つかりません (${sku})`);
      }
      
      // 商品ページロード待機
      await this.page.waitForTimeout(5000);
      
      // 価格データを取得（HTML分析に基づく改善版）
      const priceData = await this.page.evaluate((selectors) => {
        const findPrice = (selectorList) => {
          for (const selector of selectorList) {
            try {
              const element = document.querySelector(selector);
              if (element) {
                const text = element.textContent.trim();
                const price = text.replace(/[^0-9.]/g, '');
                return parseFloat(price) || null;
              }
            } catch (e) {
              continue;
            }
          }
          
          // より詳細なテキストベースの検索
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const text = el.textContent || '';
            if (text.includes('Lowest Ask') || 
                text.includes('Highest Bid') || 
                text.includes('Last Sale') ||
                (text.includes('$') && /\$[\d,]+/.test(text))) {
              
              // 同じ要素内の価格を探す
              const priceMatch = text.match(/\$([\d,]+)/);
              if (priceMatch) {
                return parseFloat(priceMatch[1].replace(/,/g, '')) || null;
              }
              
              // 次の要素をチェック
              const nextEl = el.nextElementSibling;
              if (nextEl) {
                const nextText = nextEl.textContent || '';
                const priceMatch = nextText.match(/\$([\d,]+)/);
                if (priceMatch) {
                  return parseFloat(priceMatch[1].replace(/,/g, '')) || null;
                }
              }
            }
          }
          
          return null;
        };
        
        return {
          lowestAsk: findPrice(selectors.lowestAsk),
          highestBid: findPrice(selectors.highestBid),
          lastSale: findPrice(selectors.lastSale)
        };
      }, selectors);
      
      console.log(`✅ StockX価格取得成功: ${JSON.stringify(priceData)}`);
      return priceData;
      
    } catch (error) {
      console.error(`❌ StockX価格取得エラー (${sku}):`, error.message);
      
      // スクリーンショットを保存（デバッグ用）
      try {
        await this.page.screenshot({ 
          path: `stockx-error-${sku}-${Date.now()}.png`,
          fullPage: true 
        });
      } catch (e) {}
      
      return { lowestAsk: null, highestBid: null, lastSale: null };
    }
  }
  
  /**
   * StockX APIを使用して価格を取得
   * @param {string} sku - 商品SKU
   * @returns {Object} 価格データ
   */
  async getStockXPriceViaAPI(sku) {
    try {
      // StockXの非公式APIエンドポイント
      const searchUrl = `https://stockx.com/api/browse?_search=${encodeURIComponent(sku)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://stockx.com/'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.Products && response.data.Products.length > 0) {
        const product = response.data.Products[0];
        return {
          lowestAsk: product.market?.lowestAsk || null,
          highestBid: product.market?.highestBid || null,
          lastSale: product.market?.lastSale || null
        };
      }
      
      return null;
    } catch (error) {
      console.error('StockX API エラー:', error.message);
      return null;
    }
  }
}

class JapanSiteScraper {
  /**
   * スニーカーダンクから価格を取得（人気ランキングページ版）
   * @param {string} sku - 商品SKU
   * @returns {number|null} 価格
   */
  async scrapeSnkrdunk(sku) {
    const browser = await puppeteer.launch({
      headless: false, // ブラウザを表示する
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // 人気ランキングページにアクセス
      const url = 'https://snkrdunk.com/products?type=hottest';
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log(`🔍 スニーカーダンク人気ランキングページにアクセス中...`);
      
      // ページ読み込み待機
      await page.waitForTimeout(3000);
      
      // 商品データを抽出
      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('.item-list');
        const results = [];
        
        items.forEach((item) => {
          try {
            // 商品名
            const nameElement = item.querySelector('.item-name');
            const name = nameElement ? nameElement.textContent.trim() : '';
            
            // 価格（¥記号と「〜」を除去）
            const priceElement = item.querySelector('.item-price');
            const priceText = priceElement ? priceElement.textContent.trim() : '';
            const price = priceText.replace(/[¥,〜]/g, '').trim();
            
            // 商品リンク（SKUを抽出）
            const linkElement = item.querySelector('a.item-block');
            const href = linkElement ? linkElement.href : '';
            const sku = href.split('/').pop() || '';
            
            if (name && price && !isNaN(parseInt(price))) {
              results.push({
                name: name,
                sku: sku,
                price: parseInt(price),
                link: href
              });
            }
          } catch (error) {
            console.error('商品要素の処理エラー:', error);
          }
        });
        
        return results;
      });
      
      console.log(`✅ スニーカーダンクから${products.length}件の商品を取得`);
      
      // 指定されたSKUの商品を検索
      const targetProduct = products.find(p => 
        p.sku.toLowerCase() === sku.toLowerCase() ||
        p.name.toLowerCase().includes(sku.toLowerCase())
      );
      
      if (targetProduct) {
        console.log(`✅ スニーカーダンク価格: ¥${targetProduct.price.toLocaleString()}`);
        console.log(`   商品: ${targetProduct.name}`);
        return targetProduct.price;
      } else {
        console.log(`❌ スニーカーダンクで商品が見つかりません: ${sku}`);
        console.log(`   利用可能な商品: ${products.slice(0, 5).map(p => p.name).join(', ')}...`);
        return null;
      }
      
    } catch (error) {
      console.error(`スニーカーダンク価格取得エラー (${sku}):`, error.message);
      return null;
    } finally {
      await browser.close();
    }
  }

  /**
   * メルカリから価格を取得（改善版）
   * @param {string} sku - 商品SKU
   * @returns {number|null} 価格
   */
  async scrapeMercari(sku) {
    try {
      // メルカリの新しいAPIエンドポイント
      const url = `https://api.mercari.jp/v2/search?keyword=${encodeURIComponent(sku)}&limit=1&sort=price&order=asc`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
          'Referer': 'https://www.mercari.com/'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        return parseInt(response.data.data[0].price);
      }
      
      return null;
    } catch (error) {
      console.error(`メルカリ価格取得エラー (${sku}):`, error.message);
      return null;
    }
  }

  /**
   * 複数サイトから価格を取得して最安値を返す
   * @param {string} sku - 商品SKU
   * @param {string} rakutenApiKey - 楽天APIキー
   * @returns {Object} 各サイトの価格と最安値
   */
  async scrapeAllJapanSites(sku, rakutenApiKey = null) {
    console.log(`🔍 日本サイト価格取得中: ${sku}`);
    
    const prices = {};
    
    try {
      // スニーカーダンクのみから価格を取得（メルカリは除外）
      const snkrdunkPrice = await this.scrapeSnkrdunk(sku);
      
      prices.snkrdunk = snkrdunkPrice;
      prices.mercari = null; // メルカリは除外
      prices.yahoo = null; // 一時的に無効化
      prices.rakuten = null; // 一時的に無効化
      
      // 最安値を計算
      const validPrices = Object.values(prices).filter(price => price !== null && price > 0);
      const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
      const lowestSource = lowestPrice ? 
        Object.keys(prices).find(key => prices[key] === lowestPrice) : null;
      
      console.log(`✅ 日本サイト最安値: ¥${lowestPrice || 'N/A'} (${lowestSource || 'N/A'})`);
      
      return {
        ...prices,
        lowestPrice,
        lowestSource
      };
    } catch (error) {
      console.error(`日本サイト価格取得エラー (${sku}):`, error.message);
      return {
        snkrdunk: null,
        mercari: null,
        yahoo: null,
        rakuten: null,
        lowestPrice: null,
        lowestSource: null
      };
    }
  }
}

/**
 * 為替レートを取得
 * @returns {number} USD/JPYレート
 */
async function getExchangeRate() {
  try {
    // 複数のAPIを試す
    const apis = [
      'https://api.exchangerate-api.com/v4/latest/USD',
      'https://api.frankfurter.app/latest?from=USD&to=JPY'
    ];
    
    for (const api of apis) {
      try {
        const response = await axios.get(api, { timeout: 5000 });
        
        if (api.includes('exchangerate-api')) {
          return response.data.rates.JPY;
        } else if (api.includes('frankfurter')) {
          return response.data.rates.JPY;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('すべての為替レートAPIが失敗');
  } catch (error) {
    console.error('為替レート取得エラー:', error.message);
    return 155; // デフォルト値（2024年の平均的なレート）
  }
}

module.exports = {
  StockXScraper,
  JapanSiteScraper,
  getExchangeRate
};