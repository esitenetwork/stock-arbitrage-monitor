// 利益計算モジュール

// カテゴリ別の手数料率
const FEE_RATES = {
  sneakers: {
    stockxFee: 0.095, // 9.5%
    shippingCost: 15, // USD
    customsDuty: 0.10, // 10%
    domesticShipping: 1000 // JPY
  },
  clothing: {
    stockxFee: 0.095,
    shippingCost: 12,
    customsDuty: 0.08,
    domesticShipping: 800
  },
  accessories: {
    stockxFee: 0.095,
    shippingCost: 10,
    customsDuty: 0.05,
    domesticShipping: 600
  }
};

// 利益計算関数
function calculateProfit(stockxData, japanData, category, exchangeRate) {
  const fees = FEE_RATES[category] || FEE_RATES.sneakers;
  
  // StockX売上（最低売値）
  const stockxRevenueUSD = stockxData.lowestAsk || 0;
  const stockxRevenueJPY = stockxRevenueUSD * exchangeRate;
  
  // 日本での購入価格
  const japanPurchasePrice = japanData.lowestPrice || 0;
  
  // 各種手数料計算
  const stockxFeeUSD = stockxRevenueUSD * fees.stockxFee;
  const stockxFeeJPY = stockxFeeUSD * exchangeRate;
  const shippingCostJPY = fees.shippingCost * exchangeRate;
  const customsDutyJPY = stockxRevenueJPY * fees.customsDuty;
  const domesticShippingJPY = fees.domesticShipping;
  
  // 総コスト
  const totalCostJPY = japanPurchasePrice + shippingCostJPY + customsDutyJPY + domesticShippingJPY;
  
  // 純利益
  const netProfitJPY = stockxRevenueJPY - stockxFeeJPY - totalCostJPY;
  
  // 利益率
  const profitRate = totalCostJPY > 0 ? (netProfitJPY / totalCostJPY) * 100 : 0;
  
  return {
    revenueJPY: stockxRevenueJPY,
    stockxFee: stockxFeeJPY,
    shippingCost: shippingCostJPY,
    customsDuty: customsDutyJPY,
    domesticShipping: domesticShippingJPY,
    netProfit: netProfitJPY,
    profitRate: profitRate,
    isProfitable: netProfitJPY > 0
  };
}

module.exports = {
  calculateProfit,
  FEE_RATES
};
