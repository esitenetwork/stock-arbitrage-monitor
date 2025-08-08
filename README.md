# StockX Arbitrage Monitor

A real-time price comparison and arbitrage monitoring tool for StockX sneakers.

## 🚀 Features

- **Real-time StockX price monitoring**
- **Japanese marketplace comparison** (SNKRDUNK, Mercari, Yahoo, Rakuten)
- **Profit calculation** with customs duty (30%)
- **Automated scraping** every 30 minutes via GitHub Actions
- **Free hosting** on GitHub Pages
- **Supabase database** for data storage

## 📊 Monitored Products

1. Nike Dunk Low Panda (DD1391-100)
2. Air Jordan 1 Low OG Bred Toe (553558-612)
3. Yeezy Boost 350 V2 Cream (CP9366)
4. Air Force 1 Low White (315122-111)
5. Dunk Low University Blue (DD1391-102)
6. Air Jordan 1 High OG White (BQ6817-100)
7. Air Jordan 1 High OG Shadow (555088-105)
8. Air Jordan 1 High OG Chicago (CW2288-111)
9. Air Jordan 1 High OG Black (555088-001)
10. Air Jordan 1 High OG White (555088-101)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Scraping**: Puppeteer, Axios
- **Deployment**: GitHub Pages
- **Automation**: GitHub Actions

## 🔧 Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/esitenetwork/stock-arbitrage-monitor.git
   cd stock-arbitrage-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   - Copy `env.example` to `env.local`
   - Add your Supabase credentials

4. **Database setup**
   - Run the SQL schema in Supabase SQL Editor
   - Test connection with `npm run test-supabase`

5. **Local development**
   ```bash
   npm run dev
   ```

## 📈 How it works

1. **Price Collection**: Automated scraping every 30 minutes
2. **Profit Calculation**: 
   - Revenue = StockX sale price × exchange rate
   - Costs = StockX fees + shipping + customs duty (30%) + domestic shipping
   - Net profit = Revenue - Costs
3. **Data Storage**: 3-day price history in Supabase
4. **Display**: Real-time dashboard with profitable opportunities highlighted

## 🔄 Automation

- **GitHub Actions**: Automated scraping every 30 minutes
- **GitHub Pages**: Automatic deployment on push to main
- **Supabase**: Real-time database with automatic cleanup

## 📝 License

MIT License - see LICENSE file for details.

---
*Last updated: 2025-08-08*
