import './globals.css'

export const metadata = {
  title: 'StockX Arbitrage Monitor - 価格比較ダッシュボード',
  description: 'StockXと日本サイトの価格差を監視し、利益機会を見つけるツール',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  )
}
