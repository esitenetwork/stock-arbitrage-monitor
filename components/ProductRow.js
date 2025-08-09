'use client'

import { useState } from 'react'

export default function ProductRow({ product }) {
  const [showDetail, setShowDetail] = useState(false)

  // 最新の価格データを取得
  const latestPrice = product.price_history && product.price_history.length > 0 
    ? product.price_history[0] 
    : null;

  const handleBuy = () => {
    if (confirm(`${product.name}を購入しますか？\n予想利益: ¥${latestPrice?.net_profit?.toLocaleString() || 'N/A'}`)) {
      // 購入ページへの遷移（実装予定）
      alert('購入ページへ遷移します（実装予定）')
    }
  }

  const handleDetail = () => {
    setShowDetail(!showDetail)
  }

  const getPopularityBadge = (rank) => {
    if (rank <= 3) {
      return <span className="popularity-badge hot">#{rank} 🔥</span>
    } else if (rank <= 10) {
      return <span className="popularity-badge">#{rank}</span>
    } else {
      return <span className="popularity-badge">#{rank}</span>
    }
  }

  const formatPrice = (price, currency = 'JPY') => {
    if (!price) return '-'
    return currency === 'USD' ? `$${price}` : `¥${price.toLocaleString()}`
  }

  const formatProfit = (profit) => {
    if (!profit) return '-'
    const isPositive = profit > 0
    return (
      <span className={isPositive ? 'profit-positive' : 'profit-negative'}>
        {isPositive ? '+' : ''}¥{profit.toLocaleString()}
      </span>
    )
  }

  return (
    <>
      <tr>
        <td>
          <div className="product-cell">
            <div className="product-image">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  IMG
                </div>
              )}
            </div>
            <div className="product-info">
              <div className="product-name">{product.name}</div>
              <div className="product-sku">{product.sku}</div>
              <div className="product-brand">{product.brand}</div>
            </div>
          </div>
        </td>
        
        <td className="price-cell">
          {latestPrice ? (
            <>
              {formatPrice(latestPrice.stockx_lowest_ask * 147.68, 'JPY')}
              <div className="price-usd">{formatPrice(latestPrice.stockx_lowest_ask, 'USD')}</div>
            </>
          ) : (
            '-'
          )}
        </td>
        
        <td className="price-cell">
          {latestPrice ? (
            <>
              {formatPrice(latestPrice.japan_lowest_price)}
              <div className="price-source">{latestPrice.japan_lowest_source || 'N/A'}</div>
            </>
          ) : (
            '-'
          )}
        </td>
        
        <td className="price-cell">
          {latestPrice && latestPrice.stockx_lowest_ask && latestPrice.japan_lowest_price ? (
            <span className="profit-positive">
              +¥{((latestPrice.stockx_lowest_ask * 147.68) - latestPrice.japan_lowest_price)?.toLocaleString()}
            </span>
          ) : (
            '-'
          )}
        </td>
        
        <td>
          {latestPrice ? (
            <div className="expense-details">
              手数料: ¥{latestPrice.stockx_fee?.toLocaleString() || 'N/A'}<br/>
              関税: ¥{latestPrice.customs_duty?.toLocaleString() || 'N/A'}<br/>
              国内送料: ¥{latestPrice.domestic_shipping?.toLocaleString() || 'N/A'}<br/>
              <strong>合計: ¥{((latestPrice.stockx_fee || 0) + (latestPrice.customs_duty || 0) + (latestPrice.domestic_shipping || 0))?.toLocaleString()}</strong>
            </div>
          ) : (
            '-'
          )}
        </td>
        
        <td className="profit-cell">
          {latestPrice ? (
            <>
              {formatProfit(latestPrice.net_profit)}
              <div className="profit-rate">
                利益率: {latestPrice.profit_rate?.toFixed(1) || 'N/A'}%
              </div>
            </>
          ) : (
            '-'
          )}
        </td>
        
        <td>
          {getPopularityBadge(product.popularity_rank || 999)}
        </td>
        
        <td className="action-cell">
          {latestPrice && latestPrice.net_profit > 0 ? (
            <button className="btn-buy" onClick={handleBuy}>
              購入
            </button>
          ) : (
            <button className="btn-detail" onClick={handleDetail}>
              詳細
            </button>
          )}
        </td>
      </tr>
      
      {showDetail && (
        <tr>
          <td colSpan="8" className="bg-gray-50 p-4">
            <div className="text-sm">
              <h4 className="font-semibold mb-2">詳細情報</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>最終更新:</strong> {latestPrice ? new Date(latestPrice.recorded_at).toLocaleString('ja-JP') : 'N/A'}</p>
                  <p><strong>為替レート:</strong> {latestPrice?.exchange_rate || 'N/A'}</p>
                  <p><strong>StockX URL:</strong> <a href={`https://stockx.com/${product.sku}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://stockx.com/{product.sku}</a></p>
                </div>
                <div>
                  <p><strong>価格詳細:</strong></p>
                  <ul className="text-xs text-gray-600 ml-2">
                    <li>StockX最低売値: ${latestPrice?.stockx_lowest_ask || 'N/A'}</li>
                    <li>StockX最高買値: ${latestPrice?.stockx_highest_bid || 'N/A'}</li>
                    <li>StockX最終売値: ${latestPrice?.stockx_last_sale || 'N/A'}</li>
                    <li>日本最安値: ¥{latestPrice?.japan_lowest_price?.toLocaleString() || 'N/A'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
