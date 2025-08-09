#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testStockXSelectors() {
  console.log('🔍 StockXのページ構造を確認中...');
  
  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示して確認
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // テスト用のSKU
    const testSku = 'DD1391-100'; // Nike Dunk Low Panda
    
    console.log(`📦 テスト商品: ${testSku}`);
    
    // 検索ページにアクセス
    const searchUrl = `https://stockx.com/search?s=${encodeURIComponent(testSku)}`;
    console.log(`🔗 アクセス中: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // ページの構造を確認
    console.log('\n📋 ページ構造を分析中...');
    
    const pageInfo = await page.evaluate(() => {
      // 価格関連の要素を探す
      const priceElements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach((el, index) => {
        const text = el.textContent || '';
        if (text.includes('$') || text.includes('Lowest') || text.includes('Highest') || text.includes('Last')) {
          priceElements.push({
            tag: el.tagName,
            className: el.className,
            id: el.id,
            text: text.trim().substring(0, 100),
            selector: `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}${el.id ? '#' + el.id : ''}`
          });
        }
      });
      
      // 商品カードの要素を探す
      const cardElements = [];
      const links = document.querySelectorAll('a[href*="/"]');
      links.forEach(link => {
        if (link.href.includes('stockx.com') && !link.href.includes('search')) {
          cardElements.push({
            href: link.href,
            text: link.textContent.trim().substring(0, 50),
            className: link.className
          });
        }
      });
      
      return {
        title: document.title,
        url: window.location.href,
        priceElements: priceElements.slice(0, 20), // 最初の20件のみ
        cardElements: cardElements.slice(0, 10), // 最初の10件のみ
        bodyText: document.body.textContent.substring(0, 500) // 最初の500文字
      };
    });
    
    console.log('\n📄 ページ情報:');
    console.log(`タイトル: ${pageInfo.title}`);
    console.log(`URL: ${pageInfo.url}`);
    
    console.log('\n💰 価格関連要素:');
    pageInfo.priceElements.forEach((el, index) => {
      console.log(`${index + 1}. ${el.selector} - "${el.text}"`);
    });
    
    console.log('\n🃏 商品カード要素:');
    pageInfo.cardElements.forEach((el, index) => {
      console.log(`${index + 1}. ${el.href} - "${el.text}"`);
    });
    
    console.log('\n📝 ページテキスト（最初の500文字）:');
    console.log(pageInfo.bodyText);
    
    // スクリーンショットを保存
    await page.screenshot({ 
      path: `stockx-page-structure-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('\n📸 スクリーンショットを保存しました');
    console.log('\n⏳ 10秒間ブラウザを開いたままにします...');
    
    // 10秒間待機してブラウザを確認
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }
}

testStockXSelectors();
