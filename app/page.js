'use client'

import { useState, useEffect } from 'react'
import Header from '../components/Header'
import StatsCards from '../components/StatsCards'
import FilterControls from '../components/FilterControls'
import ProductTable from '../components/ProductTable'

export default function Home() {
  const [filters, setFilters] = useState({
    brand: 'all',
    category: 'all',
    minProfit: 1000,
    size: 'all',
    popularOnly: true,
    inStockOnly: false
  })
  
  const [lastScrapeTime, setLastScrapeTime] = useState(null)
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true)

  // スクレイピング完了を監視する関数
  const checkScrapingStatus = async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      
      if (data.lastScrapeTime && data.lastScrapeTime !== lastScrapeTime) {
        console.log('新しいスクレイピングデータを検出、ページをリロードします')
        setLastScrapeTime(data.lastScrapeTime)
        
        if (isAutoRefreshEnabled) {
          // 少し待ってからリロード（データベース更新の完了を待つ）
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      }
    } catch (error) {
      console.error('スクレイピング状況の確認エラー:', error)
    }
  }

  // 初回読み込み時にスクレイピング状況を取得
  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch('/api/stats')
        const data = await response.json()
        setLastScrapeTime(data.lastScrapeTime)
      } catch (error) {
        console.error('初期スクレイピング状況の取得エラー:', error)
      }
    }
    
    fetchInitialStatus()
  }, [])

  // 定期的にスクレイピング状況をチェック（30秒ごと）
  useEffect(() => {
    if (!isAutoRefreshEnabled) return
    
    const interval = setInterval(checkScrapingStatus, 30000) // 30秒ごと
    
    return () => clearInterval(interval)
  }, [lastScrapeTime, isAutoRefreshEnabled])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleRefresh = () => {
    // 手動リフレッシュ
    window.location.reload()
  }

  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled)
  }

  return (
    <main>
      <Header />
      <StatsCards />
      <FilterControls 
        onFilterChange={handleFilterChange} 
        onRefresh={handleRefresh}
        isAutoRefreshEnabled={isAutoRefreshEnabled}
        onToggleAutoRefresh={toggleAutoRefresh}
        lastScrapeTime={lastScrapeTime}
      />
      <ProductTable filters={filters} />
    </main>
  )
}
