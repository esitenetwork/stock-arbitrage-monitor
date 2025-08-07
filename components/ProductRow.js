'use client'

import { useState } from 'react'

export default function ProductRow({ product }) {
  const [showDetail, setShowDetail] = useState(false)

  const handleBuy = () => {
    if (confirm(`${product.name}を購入しますか？\n予想利益: ¥${product.net_profit?.toLocaleString()}`)) {
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
              <div className="product-size">Size: {product.size_us}</div>
            </div>
          </div>
        </td>
        
        <td className="price-cell">
          {formatPrice(product.stockx_price_jpy)}
          <div className="price-usd">{formatPrice(product.stockx_price_usd, 'USD')}</div>
        </td>
        
        <td className="price-cell">
          {formatPrice(product.japan_lowest_price)}
          <div className="price-source">{product.japan_lowest_source}</div>
        </td>
        
        <td className="price-cell profit-positive">
          +¥{(product.stockx_price_jpy - product.japan_lowest_price)?.toLocaleString()}
        </td>
        
        <td>
          <div className="expense-details">
            手数料: ¥{product.stockx_fee?.toLocaleString()} (12.5%)<br/>
            関税: ¥{product.customs_duty?.toLocaleString()}<br/>
            国内送料: ¥{product.domestic_shipping?.toLocaleString()}<br/>
            <strong>合計: ¥{(product.stockx_fee + product.customs_duty + product.domestic_shipping)?.toLocaleString()}</strong>
          </div>
        </td>
        
        <td className="profit-cell">
          {formatProfit(product.net_profit)}
          <div className="profit-rate">
            利益率: {product.profit_rate?.toFixed(1)}%
          </div>
        </td>
        
        <td>
          {getPopularityBadge(product.popularity_rank)}
        </td>
        
        <td className="action-cell">
          {product.net_profit > 0 ? (
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
                  <p><strong>最終更新:</strong> {new Date(product.recorded_at).toLocaleString('ja-JP')}</p>
                  <p><strong>StockX URL:</strong> <a href={product.stockx_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{product.stockx_url}</a></p>
                </div>
                <div>
                  <p><strong>日本サイト価格:</strong></p>
                  <ul className="text-xs text-gray-600 ml-2">
                    {product.snkrdunk_price && <li>スニーカーダンク: ¥{product.snkrdunk_price.toLocaleString()}</li>}
                    {product.mercari_price && <li>メルカリ: ¥{product.mercari_price.toLocaleString()}</li>}
                    {product.yahoo_price && <li>ヤフオク: ¥{product.yahoo_price.toLocaleString()}</li>}
                    {product.rakuten_price && <li>楽天: ¥{product.rakuten_price.toLocaleString()}</li>}
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
