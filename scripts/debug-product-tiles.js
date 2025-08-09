require('dotenv').config({ path: './.env.local' });
const { StockXScraper } = require('../lib/scraper');

async function debugProductTiles() {
  console.log('商品カード検出デバッグ開始...\n');
  
  const scraper = new StockXScraper();
  
  try {
    await scraper.init();
    console.log('ブラウザ初期化完了');
    
    // StockX Top Modelsページにアクセス
    const url = 'https://stockx.com/category/sneakers?sort=most-active';
    await scraper.loadPageWithBotDetection(url);
    
    // ページの詳細情報を取得
    const pageInfo = await scraper.page.evaluate(() => {
      const info = {
        title: document.title,
        url: window.location.href,
        totalElements: document.querySelectorAll('*').length,
        allLinks: document.querySelectorAll('a').length,
        allDivs: document.querySelectorAll('div').length,
        allButtons: document.querySelectorAll('button').length
      };
      
      // 商品カード関連のセレクターをテスト
      const selectors = [
        '[data-testid="ProductTile"]',
        'a[data-component="product-tile"]',
        'div[data-testid="product-tile"]',
        '.css-1ibvugw-GridProductTileLink',
        'a.tile',
        'a[href*="/sneakers/"]',
        'a[href*="/shoes/"]'
      ];
      
      info.selectorResults = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        info.selectorResults[selector] = elements.length;
        
        if (elements.length > 0) {
          info.selectorResults[`${selector}_first`] = {
            href: elements[0].href || 'N/A',
            text: elements[0].textContent?.substring(0, 100) || 'N/A',
            className: elements[0].className || 'N/A',
            id: elements[0].id || 'N/A'
          };
        }
      });
      
      // すべてのdata-testid属性を持つ要素を検索
      const allDataTestIdElements = document.querySelectorAll('[data-testid]');
      info.dataTestIdElements = Array.from(allDataTestIdElements).map(el => ({
        testid: el.getAttribute('data-testid'),
        tagName: el.tagName,
        className: el.className,
        text: el.textContent?.substring(0, 50) || 'N/A'
      }));
      
      // 商品らしいリンクを検索
      const productLinks = document.querySelectorAll('a[href*="/sneakers/"], a[href*="/shoes/"]');
      info.productLinks = Array.from(productLinks).slice(0, 5).map(link => ({
        href: link.href,
        text: link.textContent?.substring(0, 50) || 'N/A',
        className: link.className
      }));
      
      return info;
    });
    
    console.log('ページ情報:');
    console.log(`タイトル: ${pageInfo.title}`);
    console.log(`URL: ${pageInfo.url}`);
    console.log(`総要素数: ${pageInfo.totalElements}`);
    console.log(`リンク数: ${pageInfo.allLinks}`);
    console.log(`div数: ${pageInfo.allDivs}`);
    console.log(`ボタン数: ${pageInfo.allButtons}`);
    
    console.log('\nセレクター結果:');
    Object.entries(pageInfo.selectorResults).forEach(([selector, result]) => {
      if (typeof result === 'number') {
        console.log(`${selector}: ${result}件`);
        if (pageInfo.selectorResults[`${selector}_first`]) {
          const first = pageInfo.selectorResults[`${selector}_first`];
          console.log(`  最初の要素: ${first.text} (${first.href})`);
        }
      }
    });
    
    console.log('\ndata-testid属性を持つ要素:');
    pageInfo.dataTestIdElements.forEach(el => {
      console.log(`- ${el.testid}: ${el.tagName} (${el.text})`);
    });
    
    console.log('\n商品らしいリンク:');
    pageInfo.productLinks.forEach(link => {
      console.log(`- ${link.text} (${link.href})`);
    });
    
  } catch (error) {
    console.error('デバッグエラー:', error.message);
  } finally {
    await scraper.close();
  }
}

debugProductTiles().catch(console.error);
