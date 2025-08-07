'use client'

import { useState } from 'react'
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleRefresh = () => {
    // ページをリロードしてデータを更新
    window.location.reload()
  }

  return (
    <main>
      <Header />
      <StatsCards />
      <FilterControls onFilterChange={handleFilterChange} onRefresh={handleRefresh} />
      <ProductTable filters={filters} />
    </main>
  )
}
