#!/usr/bin/env node

require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// テスト商品データ
const testProducts = [
  {
    brand: 'Nike',
    name: 'Dunk Low Panda',
    sku: 'DD1391-100',
    category: 'sneakers',
    popularity_rank: 1,
    is_active: true
  },
  {
    brand: 'Nike',
    name: 'Air Jordan 1 Low OG Bred Toe',
    sku: '553558-612',
    category: 'sneakers',
    popularity_rank: 2,
    is_active: true
  },
  {
    brand: 'Adidas',
    name: 'Yeezy Boost 350 V2 Cream',
    sku: 'CP9366',
    category: 'sneakers',
    popularity_rank: 3,
    is_active: true
  }
];

async function addTestData() {
  console.log('テストデータを追加中...');
  
  try {
    // 商品データを追加
    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert(testProducts)
      .select('id, name');
    
    if (productsError) {
      console.error('商品データ追加エラー:', productsError);
      return;
    }
    
    console.log('✓ 商品データ追加完了:', products.length, '件');
    
    // サイズデータを追加
    const sizes = [];
    for (const product of products) {
      sizes.push({
        product_id: product.id,
        size_us: '9',
        size_jp: '27.5',
        size_eu: '42.5'
      });
    }
    
    const { data: sizeData, error: sizesError } = await supabase
      .from('sizes')
      .insert(sizes)
      .select('id, product_id');
    
    if (sizesError) {
      console.error('サイズデータ追加エラー:', sizesError);
      return;
    }
    
    console.log('✓ サイズデータ追加完了:', sizeData.length, '件');
    
    // 為替レートを追加
    const { error: rateError } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: 'USD',
        to_currency: 'JPY',
        rate: 155.50
      });
    
    if (rateError) {
      console.error('為替レート追加エラー:', rateError);
    } else {
      console.log('✓ 為替レート追加完了');
    }
    
    console.log('✅ テストデータ追加完了！');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

addTestData();
