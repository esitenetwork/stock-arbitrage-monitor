'use client'

import { useState, useEffect } from 'react'

export default function StatsCards() {
  const [stats, setStats] = useState({
    totalProducts: 248,
    profitableProducts: 37,
    avgProfitRate: 18.5,
    maxProfit: 8750,
    maxProfitProduct: 'Dunk Low Chicago',
    changes: {
      totalProducts: 12,
      profitableProducts: 5,
      avgProfitRate: -2.3
    }
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('統計データ取得エラー:', error)
      }
    }

    fetchStats()
    
    // 30分ごとに統計を更新
    const interval = setInterval(fetchStats, 30 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-title">監視中の商品</div>
        <div className="stat-value">{stats.totalProducts.toLocaleString()}</div>
        <div className={`stat-change ${stats.changes.totalProducts >= 0 ? 'positive' : 'negative'}`}>
          {stats.changes.totalProducts >= 0 ? '+' : ''}{stats.changes.totalProducts} 本日追加
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-title">利益可能商品</div>
        <div className="stat-value">{stats.profitableProducts}</div>
        <div className={`stat-change ${stats.changes.profitableProducts >= 0 ? 'positive' : 'negative'}`}>
          {stats.changes.profitableProducts >= 0 ? '+' : ''}{stats.changes.profitableProducts} 前日比
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-title">平均利益率</div>
        <div className="stat-value">{stats.avgProfitRate}%</div>
        <div className={`stat-change ${stats.changes.avgProfitRate >= 0 ? 'positive' : 'negative'}`}>
          {stats.changes.avgProfitRate >= 0 ? '+' : ''}{stats.changes.avgProfitRate}%
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-title">最高利益商品</div>
        <div className="stat-value">¥{stats.maxProfit.toLocaleString()}</div>
        <div className="stat-change">{stats.maxProfitProduct}</div>
      </div>
    </div>
  )
}
