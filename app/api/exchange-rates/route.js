import { NextResponse } from 'next/server'
import { getLatestExchangeRate } from '../../../lib/supabase'

export async function GET() {
  try {
    // データベースから最新の為替レートを取得
    const rate = await getLatestExchangeRate()
    
    return NextResponse.json({
      rate: rate,
      currency: 'USD/JPY',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('為替レート取得エラー:', error)
    
    // エラー時はデフォルト値を返す
    return NextResponse.json({
      rate: 155.00,
      currency: 'USD/JPY',
      timestamp: new Date().toISOString()
    })
  }
}
