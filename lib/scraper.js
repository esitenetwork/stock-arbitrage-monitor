const puppeteer = require('puppeteer')
const axios = require('axios')

/**
 * StockX価格比較ツール用のスクレイピングサービス
 */

class StockXScraper {
  constructor() {
    this.browser = null
    this.page = null
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    })
    this.page = await this.browser.newPage()
    
    // User-Agentを設定
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // ビューポートを設定
    await this.page.setViewport({ width: 1920, height: 1080 })
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  /**
   * StockXから商品価格を取得
   * @param {string} sku - 商品SKU
   * @returns {Object} 価格データ
   */
  async scrapeStockXPrice(sku) {
    try {
      const url = `https://stockx.com/search?s=${encodeURIComponent(sku)}`
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // 検索結果から最初の商品をクリック
      await this.page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 })
      await this.page.click('[data-testid="product-card"]')
      
      // 商品ページで価格データを取得
      await this.page.waitForSelector('[data-testid="bid-ask"]', { timeout: 10000 })
      
      const priceData = await this.page.evaluate(() => {
        const lowestAsk = document.querySelector('[data-testid="lowest-ask"]')?.textContent
        const highestBid = document.querySelector('[data-testid="highest-bid"]')?.textContent
        const lastSale = document.querySelector('[data-testid="last-sale"]')?.textContent
        
        return {
          lowestAsk: lowestAsk ? parseFloat(lowestAsk.replace('$', '')) : null,
          highestBid: highestBid ? parseFloat(highestBid.replace('$', '')) : null,
          lastSale: lastSale ? parseFloat(lastSale.replace('$', '')) : null
        }
      })
      
      return priceData
    } catch (error) {
      console.error(`StockX価格取得エラー (${sku}):`, error.message)
      return { lowestAsk: null, highestBid: null, lastSale: null }
    }
  }

  /**
   * 複数商品のStockX価格を一括取得
   * @param {Array} skus - SKUの配列
   * @returns {Object} SKU別価格データ
   */
  async scrapeStockXPrices(skus) {
    const results = {}
    
    for (const sku of skus) {
      try {
        const priceData = await this.scrapeStockXPrice(sku)
        results[sku] = priceData
        
        // レート制限を避けるため少し待機
        await this.page.waitForTimeout(2000)
      } catch (error) {
        console.error(`SKU ${sku} の処理でエラー:`, error.message)
        results[sku] = { lowestAsk: null, highestBid: null, lastSale: null }
      }
    }
    
    return results
  }
}

class JapanSiteScraper {
  /**
   * スニーカーダンクから価格を取得
   * @param {string} sku - 商品SKU
   * @returns {number|null} 価格
   */
  async scrapeSnkrdunk(sku) {
    try {
      const url = `https://snkrdunk.com/search?q=${encodeURIComponent(sku)}`
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      })
      
      // 簡易的な価格抽出（実際の実装ではより詳細なパースが必要）
      const priceMatch = response.data.match(/¥([0-9,]+)/)
      return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null
    } catch (error) {
      console.error(`スニーカーダンク価格取得エラー (${sku}):`, error.message)
      return null
    }
  }

  /**
   * メルカリから価格を取得
   * @param {string} sku - 商品SKU
   * @returns {number|null} 価格
   */
  async scrapeMercari(sku) {
    try {
      const url = `https://mercari.com/search?keyword=${encodeURIComponent(sku)}`
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      })
      
      // 簡易的な価格抽出
      const priceMatch = response.data.match(/¥([0-9,]+)/)
      return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null
    } catch (error) {
      console.error(`メルカリ価格取得エラー (${sku}):`, error.message)
      return null
    }
  }

  /**
   * ヤフオクから価格を取得
   * @param {string} sku - 商品SKU
   * @returns {number|null} 価格
   */
  async scrapeYahoo(sku) {
    try {
      const url = `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(sku)}`
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      })
      
      // 簡易的な価格抽出
      const priceMatch = response.data.match(/¥([0-9,]+)/)
      return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null
    } catch (error) {
      console.error(`ヤフオク価格取得エラー (${sku}):`, error.message)
      return null
    }
  }

  /**
   * 楽天市場から価格を取得（API使用）
   * @param {string} sku - 商品SKU
   * @param {string} apiKey - 楽天APIキー
   * @returns {number|null} 価格
   */
  async scrapeRakuten(sku, apiKey) {
    try {
      const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170628`
      const params = {
        applicationId: apiKey,
        keyword: sku,
        hits: 1,
        sort: '+price'
      }
      
      const response = await axios.get(url, { params, timeout: 10000 })
      
      if (response.data.Items && response.data.Items.length > 0) {
        return parseInt(response.data.Items[0].Item.itemPrice)
      }
      
      return null
    } catch (error) {
      console.error(`楽天価格取得エラー (${sku}):`, error.message)
      return null
    }
  }

  /**
   * 複数サイトから価格を取得して最安値を返す
   * @param {string} sku - 商品SKU
   * @param {string} rakutenApiKey - 楽天APIキー
   * @returns {Object} 各サイトの価格と最安値
   */
  async scrapeAllJapanSites(sku, rakutenApiKey = null) {
    const prices = {}
    
    try {
      // 並行して各サイトから価格を取得
      const [snkrdunkPrice, mercariPrice, yahooPrice, rakutenPrice] = await Promise.allSettled([
        this.scrapeSnkrdunk(sku),
        this.scrapeMercari(sku),
        this.scrapeYahoo(sku),
        rakutenApiKey ? this.scrapeRakuten(sku, rakutenApiKey) : Promise.resolve(null)
      ])
      
      prices.snkrdunk = snkrdunkPrice.status === 'fulfilled' ? snkrdunkPrice.value : null
      prices.mercari = mercariPrice.status === 'fulfilled' ? mercariPrice.value : null
      prices.yahoo = yahooPrice.status === 'fulfilled' ? yahooPrice.value : null
      prices.rakuten = rakutenPrice.status === 'fulfilled' ? rakutenPrice.value : null
      
      // 最安値を計算
      const validPrices = Object.values(prices).filter(price => price !== null)
      const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null
      const lowestSource = lowestPrice ? 
        Object.keys(prices).find(key => prices[key] === lowestPrice) : null
      
      return {
        ...prices,
        lowestPrice,
        lowestSource
      }
    } catch (error) {
      console.error(`日本サイト価格取得エラー (${sku}):`, error.message)
      return {
        snkrdunk: null,
        mercari: null,
        yahoo: null,
        rakuten: null,
        lowestPrice: null,
        lowestSource: null
      }
    }
  }
}

/**
 * 為替レートを取得
 * @returns {number} USD/JPYレート
 */
async function getExchangeRate() {
  try {
    // 無料の為替レートAPIを使用
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
      timeout: 10000
    })
    
    return response.data.rates.JPY
  } catch (error) {
    console.error('為替レート取得エラー:', error.message)
    return 155 // デフォルト値
  }
}

module.exports = {
  StockXScraper,
  JapanSiteScraper,
  getExchangeRate
}
