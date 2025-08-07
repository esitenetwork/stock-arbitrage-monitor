'use client'

import { useState, useEffect } from 'react'
import ProductRow from './ProductRow'

export default function ProductTable({ filters }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('popularity')

  useEffect(() => {
    fetchProducts()
  }, [filters, sortBy])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...filters,
        sortBy,
        limit: 100
      })
      
      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('商品データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csvContent = generateCSV(products)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `stockx_arbitrage_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generateCSV = (products) => {
    const headers = [
      '商品名', 'SKU', 'サイズ', 'ブランド', 'カテゴリ',
      'StockX価格(USD)', 'StockX価格(JPY)', '日本最安値', '日本サイト',
      '差額', '手数料', '関税', '国内送料', '予想利益', '利益率', '人気度'
    ]
    
    const rows = products.map(product => [
      product.name,
      product.sku,
      product.size_us,
      product.brand,
      product.category,
      product.stockx_price_usd,
      product.stockx_price_jpy,
      product.japan_lowest_price,
      product.japan_lowest_source,
      product.price_difference,
      product.stockx_fee,
      product.customs_duty,
      product.domestic_shipping,
      product.net_profit,
      product.profit_rate,
      product.popularity_rank
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const handleSort = (newSortBy) => {
    setSortBy(newSortBy)
  }

  if (loading) {
    return (
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">価格比較リスト</h2>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-container">
      <div className="table-header">
        <h2 className="table-title">価格比較リスト</h2>
        <button className="export-btn" onClick={handleExport}>
          📥 CSVエクスポート
        </button>
      </div>
      
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>商品情報</th>
              <th style={{ width: '10%' }}>StockX価格</th>
              <th style={{ width: '10%' }}>日本最安値</th>
              <th style={{ width: '10%' }}>差額</th>
              <th style={{ width: '20%' }}>経費内訳</th>
              <th style={{ width: '10%' }}>予想利益</th>
              <th style={{ width: '8%' }}>人気度</th>
              <th style={{ width: '7%' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  条件に一致する商品が見つかりませんでした
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <ProductRow key={`${product.id}-${product.size_id}`} product={product} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
