'use client'

import { useState } from 'react'

export default function FilterControls({ onFilterChange, onRefresh }) {
  const [filters, setFilters] = useState({
    brand: 'all',
    category: 'all',
    minProfit: 1000,
    size: 'all',
    popularOnly: true,
    inStockOnly: false
  })

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleRefresh = () => {
    onRefresh()
  }

  return (
    <div className="controls">
      <div className="filter-row">
        <div className="filter-group">
          <label className="filter-label">ブランド</label>
          <select 
            className="filter-select"
            value={filters.brand}
            onChange={(e) => handleFilterChange('brand', e.target.value)}
          >
            <option value="all">すべて</option>
            <option value="nike">Nike</option>
            <option value="adidas">Adidas</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">カテゴリ</label>
          <select 
            className="filter-select"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="all">すべて</option>
            <option value="sneakers">スニーカー</option>
            <option value="sandals">サンダル</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">最低利益</label>
          <input 
            type="number" 
            className="filter-input" 
            placeholder="¥1,000" 
            value={filters.minProfit}
            onChange={(e) => handleFilterChange('minProfit', parseInt(e.target.value) || 0)}
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label">サイズ</label>
          <select 
            className="filter-select"
            value={filters.size}
            onChange={(e) => handleFilterChange('size', e.target.value)}
          >
            <option value="all">すべて</option>
            <option value="small">US 4-7</option>
            <option value="regular">US 8-11</option>
            <option value="large">US 12+</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">表示オプション</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div 
              className={`filter-checkbox ${filters.popularOnly ? 'active' : ''}`}
              onClick={() => handleFilterChange('popularOnly', !filters.popularOnly)}
            >
              人気商品のみ
            </div>
            <div 
              className={`filter-checkbox ${filters.inStockOnly ? 'active' : ''}`}
              onClick={() => handleFilterChange('inStockOnly', !filters.inStockOnly)}
            >
              在庫ありのみ
            </div>
          </div>
        </div>
        
        <button className="btn-refresh" onClick={handleRefresh}>
          🔄 更新
        </button>
      </div>
    </div>
  )
}
