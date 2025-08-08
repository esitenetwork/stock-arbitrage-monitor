(()=>{var e={};e.id=684,e.ids=[684],e.modules={9608:e=>{function r(e){var r=Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}r.keys=()=>[],r.resolve=r,r.id=9608,e.exports=r},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2615:e=>{"use strict";e.exports=require("http")},8791:e=>{"use strict";e.exports=require("https")},8621:e=>{"use strict";e.exports=require("punycode")},6162:e=>{"use strict";e.exports=require("stream")},7360:e=>{"use strict";e.exports=require("url")},1568:e=>{"use strict";e.exports=require("zlib")},6661:(e,r,t)=>{"use strict";t.r(r),t.d(r,{originalPathname:()=>l,patchFetch:()=>A,requestAsyncStorage:()=>_,routeModule:()=>u,serverHooks:()=>d,staticGenerationAsyncStorage:()=>E});var o={};t.r(o),t.d(o,{GET:()=>p});var s=t(9303),i=t(8716),a=t(670),c=t(7070),n=t(6995);async function p(e){try{let{searchParams:r}=new URL(e.url),t=r.get("brand"),o=r.get("category"),s=r.get("minProfit"),i=r.get("size"),a=r.get("popularOnly"),p=r.get("inStockOnly"),u=r.get("sortBy")||"popularity",_=parseInt(r.get("limit"))||100,E={};t&&"all"!==t&&(E.brand=t),o&&"all"!==o&&(E.category=o),s&&(E.minProfit=parseInt(s)),"true"===a&&(E.popularOnly=!0),"true"===p&&(E.inStockOnly=!0);let d=await (0,n.getProducts)(E),l=d;switch(i&&"all"!==i&&(l=d.filter(e=>{let r=parseFloat(e.size_us?.replace("US ","")||"0");switch(i){case"small":return r>=4&&r<=7;case"regular":return r>=8&&r<=11;case"large":return r>=12;default:return!0}})),u){case"profit":l.sort((e,r)=>(r.net_profit||0)-(e.net_profit||0));break;case"profit_rate":l.sort((e,r)=>(r.profit_rate||0)-(e.profit_rate||0));break;default:l.sort((e,r)=>(e.popularity_rank||999)-(r.popularity_rank||999))}return l=l.slice(0,_),c.NextResponse.json(l)}catch(e){return console.error("商品データ取得エラー:",e),c.NextResponse.json({error:"商品データの取得に失敗しました"},{status:500})}}let u=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/products/route",pathname:"/api/products",filename:"route",bundlePath:"app/api/products/route"},resolvedPagePath:"/home/runner/work/stock-arbitrage-monitor/stock-arbitrage-monitor/app/api/products/route.js",nextConfigOutput:"",userland:o}),{requestAsyncStorage:_,staticGenerationAsyncStorage:E,serverHooks:d}=u,l="/api/products/route";function A(){return(0,a.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:E})}},6995:(e,r,t)=>{"use strict";let{createClient:o}=t(9498),s="https://rzydussozubiylwoletp.supabase.co",i=process.env.SUPABASE_SERVICE_ROLE_KEY;s&&i||(console.error("Supabase環境変数が設定されていません"),process.exit(1));let a=o(s,i);async function c(){try{let{data:e,error:r}=await a.from("products").select("count").limit(1);if(r)throw r;return console.log("✓ Supabase connected successfully"),!0}catch(e){return console.error("✗ Supabase connection failed:",e.message),!1}}async function n(){return console.log("⚠️ Supabaseでは手動でテーブルを作成してください"),console.log("Supabaseダッシュボードで以下のSQLを実行してください:"),console.log(`
-- 商品マスタテーブル
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  brand VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  image_url TEXT,
  stockx_url TEXT,
  popularity_rank INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- サイズマスタテーブル
CREATE TABLE IF NOT EXISTS sizes (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  size_us VARCHAR(10) NOT NULL,
  size_jp VARCHAR(10),
  size_eu VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 価格履歴テーブル（3日間のみ保持）
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  size_id BIGINT REFERENCES sizes(id) ON DELETE CASCADE,
  
  -- StockX価格データ
  stockx_lowest_ask DECIMAL(10,2),
  stockx_highest_bid DECIMAL(10,2),
  stockx_last_sale DECIMAL(10,2),
  stockx_currency VARCHAR(3) DEFAULT 'USD',
  
  -- 日本サイト価格データ
  snkrdunk_price DECIMAL(10,0),
  mercari_price DECIMAL(10,0),
  yahoo_price DECIMAL(10,0),
  rakuten_price DECIMAL(10,0),
  japan_lowest_price DECIMAL(10,0),
  japan_lowest_source VARCHAR(50),
  
  -- 利益計算データ
  exchange_rate DECIMAL(8,4),
  revenue_jpy DECIMAL(10,0),
  stockx_fee DECIMAL(10,0),
  shipping_cost DECIMAL(10,0),
  customs_duty DECIMAL(10,0),
  domestic_shipping DECIMAL(10,0),
  net_profit DECIMAL(10,0),
  profit_rate DECIMAL(5,2),
  
  -- メタデータ
  is_profitable BOOLEAN DEFAULT false,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- 為替レート履歴テーブル
CREATE TABLE IF NOT EXISTS exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  from_currency VARCHAR(3) DEFAULT 'USD',
  to_currency VARCHAR(3) DEFAULT 'JPY',
  rate DECIMAL(8,4) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_popularity ON products(popularity_rank);
CREATE INDEX IF NOT EXISTS idx_price_history_product_recorded ON price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_profit ON price_history(is_profitable, profit_rate DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_recorded ON exchange_rates(recorded_at DESC);

-- 3日以上古い価格履歴を自動削除する関数
CREATE OR REPLACE FUNCTION cleanup_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM price_history 
  WHERE recorded_at < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- 毎日実行されるクリーンアップジョブ（手動で設定）
-- SELECT cron.schedule('cleanup-price-history', '0 2 * * *', 'SELECT cleanup_old_price_history();');
  `),!0}async function p(e={}){let r=a.from("products").select(`
      *,
      price_history!inner(
        net_profit,
        profit_rate,
        recorded_at
      )
    `).eq("is_active",!0).order("popularity_rank",{ascending:!0});e.brand&&(r=r.in("brand",Array.isArray(e.brand)?e.brand:[e.brand])),e.category&&(r=r.in("category",Array.isArray(e.category)?e.category:[e.category])),e.minProfit&&(r=r.gte("price_history.net_profit",e.minProfit));let{data:t,error:o}=await r.limit(100);return o?(console.error("Error fetching products:",o),[]):t||[]}async function u(e){let{data:r,error:t}=await a.from("products").select("*").eq("id",e).eq("is_active",!0).single();if(t||!r)return null;let{data:o,error:s}=await a.from("sizes").select(`
      *,
      price_history(
        stockx_lowest_ask,
        japan_lowest_price,
        japan_lowest_source,
        net_profit,
        profit_rate,
        is_profitable,
        recorded_at
      )
    `).eq("product_id",e).order("size_us",{ascending:!0});return s?(console.error("Error fetching sizes:",s),{...r,sizes:[]}):{...r,sizes:o||[]}}async function _(e){let{data:r,error:t}=await a.from("price_history").insert({product_id:e.productId,size_id:e.sizeId,stockx_lowest_ask:e.stockxLowestAsk,stockx_highest_bid:e.stockxHighestBid,stockx_last_sale:e.stockxLastSale,snkrdunk_price:e.snkrdunkPrice,mercari_price:e.mercariPrice,yahoo_price:e.yahooPrice,rakuten_price:e.rakutenPrice,japan_lowest_price:e.japanLowestPrice,japan_lowest_source:e.japanLowestSource,exchange_rate:e.exchangeRate,revenue_jpy:e.revenueJpy,stockx_fee:e.stockxFee,shipping_cost:e.shippingCost,customs_duty:e.customsDuty,domestic_shipping:e.domesticShipping,net_profit:e.netProfit,profit_rate:e.profitRate,is_profitable:e.isProfitable}).select("id").single();if(t)throw console.error("Error saving price history:",t),t;return r.id}async function E(){let{data:e,error:r}=await a.from("exchange_rates").select("rate").eq("from_currency","USD").eq("to_currency","JPY").order("recorded_at",{ascending:!1}).limit(1).single();return r||!e?155:e.rate}async function d(e){let{error:r}=await a.from("exchange_rates").insert({from_currency:"USD",to_currency:"JPY",rate:e});if(r)throw console.error("Error saving exchange rate:",r),r}async function l(){let{error:e}=await a.from("price_history").delete().lt("recorded_at",new Date(Date.now()-2592e5).toISOString());if(e)throw console.error("Error cleaning up old price history:",e),e;console.log("✓ Old price history cleaned up")}e.exports={supabase:a,testConnection:c,initializeSchema:n,getProducts:p,getProductDetail:u,savePriceHistory:_,getLatestExchangeRate:E,saveExchangeRate:d,cleanupOldPriceHistory:l}}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),o=r.X(0,[276,338],()=>t(6661));module.exports=o})();