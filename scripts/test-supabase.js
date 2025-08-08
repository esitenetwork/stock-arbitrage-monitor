#!/usr/bin/env node

require('dotenv').config({ path: './env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません');
  console.log('env.localファイルを確認してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔗 Supabase接続テスト開始...');
  
  try {
    // 接続テスト
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ 接続エラー:', error.message);
      return false;
    }
    
    console.log('✅ Supabase接続成功!');
    return true;
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('\n📋 テーブル確認...');
  
  const tables = ['products', 'sizes', 'price_history', 'exchange_rates', 'scrape_history'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: テーブル存在`);
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
}

async function main() {
  const isConnected = await testConnection();
  
  if (isConnected) {
    await checkTables();
  }
}

main().catch(console.error);
