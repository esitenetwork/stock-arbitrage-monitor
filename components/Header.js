'use client'

import { useState, useEffect } from 'react'

export default function Header() {
  const [exchangeRate, setExchangeRate] = useState(155.00)
  const [lastUpdate, setLastUpdate] = useState('15:30')

  useEffect(() => {
    // 為替レートと最終更新時刻を取得
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('/api/exchange-rates')
        const data = await response.json()
        if (data.rate) {
          setExchangeRate(data.rate)
        }
      } catch (error) {
        console.error('為替レート取得エラー:', error)
      }
    }

    fetchExchangeRate()
    
    // 1時間ごとに為替レートを更新
    const interval = setInterval(fetchExchangeRate, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // 現在時刻を更新
    const updateTime = () => {
      const now = new Date()
      setLastUpdate(now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // 1分ごと
    
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          📊 StockX Arbitrage Monitor
        </div>
        <div className="header-info">
          <div className="exchange-rate">
            💱 1 USD = ¥{exchangeRate.toFixed(2)}
          </div>
          <div className="update-status">
            <span className="status-dot"></span>
            <span>最終更新: {lastUpdate}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
