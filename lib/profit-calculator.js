/**
 * StockX価格比較ツール用の利益計算ロジック
 */

// 為替レート（デフォルト値、実際はAPIから取得）
const DEFAULT_EXCHANGE_RATE = 155

// 関税計算
function calculateCustomsDuty(japanPrice, category) {
  if (category === 'sandals') {
    return 0 // サンダルは関税なし
  }
  
  // スニーカーの場合、30%の関税（最低4,300円）
  const duty = japanPrice * 0.3
  return Math.max(duty, 4300)
}

// StockX手数料計算
function calculateStockXFee(revenueJPY) {
  return revenueJPY * 0.125 // 12.5%
}

// 送料計算
function calculateShippingCost(category) {
  // StockXは送料を負担するため、国際送料は0
  return 0
}

// 国内送料計算
function calculateDomesticShipping() {
  return 700 // 平均的な国内送料
}

/**
 * 利益計算メイン関数
 * @param {Object} stockxData - StockX価格データ
 * @param {Object} japanData - 日本サイト価格データ
 * @param {string} category - 商品カテゴリ ('sneakers' or 'sandals')
 * @param {number} exchangeRate - 為替レート
 * @returns {Object} 利益計算結果
 */
export function calculateProfit(stockxData, japanData, category, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  const stockxPriceUSD = stockxData.lowestAsk || stockxData.lastSale || 0
  const japanLowestPrice = japanData.lowestPrice || 0
  
  if (!stockxPriceUSD || !japanLowestPrice) {
    return {
      revenue: 0,
      expenses: {
        stockxFee: 0,
        shipping: 0,
        customs: 0,
        domestic: 0
      },
      netProfit: 0,
      profitRate: 0,
      worthBuying: false,
      error: '価格データが不足しています'
    }
  }

  // StockX販売価格（円換算）
  const revenueJPY = stockxPriceUSD * exchangeRate
  
  // 経費計算
  const stockxFee = calculateStockXFee(revenueJPY)
  const shippingCost = calculateShippingCost(category)
  const customsDuty = calculateCustomsDuty(japanLowestPrice, category)
  const domesticShipping = calculateDomesticShipping()
  
  const totalExpenses = stockxFee + shippingCost + customsDuty + domesticShipping
  const netProfit = revenueJPY - japanLowestPrice - totalExpenses
  const profitRate = japanLowestPrice > 0 ? (netProfit / japanLowestPrice) * 100 : 0
  
  // 利益性判定（最低1,000円の利益かつ10%以上の利益率）
  const worthBuying = netProfit > 1000 && profitRate > 10

  return {
    revenue: Math.round(revenueJPY),
    expenses: {
      stockxFee: Math.round(stockxFee),
      shipping: Math.round(shippingCost),
      customs: Math.round(customsDuty),
      domestic: Math.round(domesticShipping)
    },
    netProfit: Math.round(netProfit),
    profitRate: Math.round(profitRate * 100) / 100,
    worthBuying,
    exchangeRate,
    stockxPriceUSD,
    japanLowestPrice
  }
}

/**
 * 複数サイズの利益計算
 * @param {Array} sizes - サイズデータの配列
 * @param {Object} stockxPrices - サイズ別StockX価格
 * @param {Object} japanPrices - サイズ別日本価格
 * @param {string} category - 商品カテゴリ
 * @param {number} exchangeRate - 為替レート
 * @returns {Array} サイズ別利益計算結果
 */
export function calculateProfitForSizes(sizes, stockxPrices, japanPrices, category, exchangeRate) {
  return sizes.map(size => {
    const stockxData = stockxPrices[size.size_us] || {}
    const japanData = japanPrices[size.size_us] || {}
    
    const profit = calculateProfit(stockxData, japanData, category, exchangeRate)
    
    return {
      size: size.size_us,
      sizeId: size.id,
      ...profit
    }
  })
}

/**
 * 利益率による商品ランキング
 * @param {Array} products - 商品データの配列
 * @returns {Array} 利益率順にソートされた商品配列
 */
export function rankByProfitability(products) {
  return products
    .filter(product => product.netProfit > 0)
    .sort((a, b) => b.profitRate - a.profitRate)
}

/**
 * 利益額による商品ランキング
 * @param {Array} products - 商品データの配列
 * @returns {Array} 利益額順にソートされた商品配列
 */
export function rankByProfitAmount(products) {
  return products
    .filter(product => product.netProfit > 0)
    .sort((a, b) => b.netProfit - a.netProfit)
}

/**
 * リスク調整済み利益率の計算
 * @param {Object} profitData - 利益計算結果
 * @param {number} volatility - 価格変動率（0-1）
 * @returns {number} リスク調整済み利益率
 */
export function calculateRiskAdjustedProfit(profitData, volatility = 0.1) {
  const { profitRate, netProfit } = profitData
  
  // シンプルなリスク調整（変動率を考慮）
  const riskAdjustedRate = profitRate * (1 - volatility)
  
  return {
    ...profitData,
    riskAdjustedRate: Math.round(riskAdjustedRate * 100) / 100,
    riskLevel: volatility > 0.2 ? 'high' : volatility > 0.1 ? 'medium' : 'low'
  }
}

/**
 * 為替レート変動の影響をシミュレート
 * @param {Object} profitData - 現在の利益計算結果
 * @param {number} exchangeRateChange - 為替レート変動幅（%）
 * @returns {Object} 変動後の利益計算結果
 */
export function simulateExchangeRateChange(profitData, exchangeRateChange) {
  const newExchangeRate = profitData.exchangeRate * (1 + exchangeRateChange / 100)
  const newRevenue = profitData.stockxPriceUSD * newExchangeRate
  const newStockxFee = calculateStockXFee(newRevenue)
  
  const newNetProfit = newRevenue - profitData.japanLowestPrice - 
    newStockxFee - profitData.expenses.customs - profitData.expenses.domestic
  
  return {
    ...profitData,
    exchangeRate: newExchangeRate,
    revenue: Math.round(newRevenue),
    expenses: {
      ...profitData.expenses,
      stockxFee: Math.round(newStockxFee)
    },
    netProfit: Math.round(newNetProfit),
    profitRate: Math.round((newNetProfit / profitData.japanLowestPrice) * 10000) / 100
  }
}
