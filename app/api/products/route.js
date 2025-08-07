import { NextResponse } from 'next/server'
import { getProducts } from '../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // クエリパラメータを取得
    const brand = searchParams.get('brand')
    const category = searchParams.get('category')
    const minProfit = searchParams.get('minProfit')
    const size = searchParams.get('size')
    const popularOnly = searchParams.get('popularOnly')
    const inStockOnly = searchParams.get('inStockOnly')
    const sortBy = searchParams.get('sortBy') || 'popularity'
    const limit = parseInt(searchParams.get('limit')) || 100

    // フィルター条件を構築
    const filters = {}
    
    if (brand && brand !== 'all') {
      filters.brand = brand
    }
    
    if (category && category !== 'all') {
      filters.category = category
    }
    
    if (minProfit) {
      filters.minProfit = parseInt(minProfit)
    }
    
    if (popularOnly === 'true') {
      filters.popularOnly = true
    }
    
    if (inStockOnly === 'true') {
      filters.inStockOnly = true
    }

    // データベースから商品データを取得
    const products = await getProducts(filters)
    
    // サイズフィルターを適用（フロントエンド側で処理）
    let filteredProducts = products
    
    if (size && size !== 'all') {
      filteredProducts = products.filter(product => {
        const sizeNum = parseFloat(product.size_us?.replace('US ', '') || '0')
        switch (size) {
          case 'small':
            return sizeNum >= 4 && sizeNum <= 7
          case 'regular':
            return sizeNum >= 8 && sizeNum <= 11
          case 'large':
            return sizeNum >= 12
          default:
            return true
        }
      })
    }

    // ソートを適用
    switch (sortBy) {
      case 'profit':
        filteredProducts.sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))
        break
      case 'profit_rate':
        filteredProducts.sort((a, b) => (b.profit_rate || 0) - (a.profit_rate || 0))
        break
      case 'popularity':
      default:
        filteredProducts.sort((a, b) => (a.popularity_rank || 999) - (b.popularity_rank || 999))
        break
    }

    // リミットを適用
    filteredProducts = filteredProducts.slice(0, limit)

    return NextResponse.json(filteredProducts)
  } catch (error) {
    console.error('商品データ取得エラー:', error)
    return NextResponse.json(
      { error: '商品データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
