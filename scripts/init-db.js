#!/usr/bin/env node

const { testConnection, initializeSchema } = require('../lib/database')

async function initDatabase() {
  console.log('🚀 StockX Arbitrage Monitor データベース初期化を開始します...')
  
  try {
    // データベース接続テスト
    console.log('📡 データベース接続をテスト中...')
    const isConnected = await testConnection()
    
    if (!isConnected) {
      console.error('❌ データベース接続に失敗しました')
      console.log('💡 以下の点を確認してください:')
      console.log('   1. PostgreSQLが起動しているか')
      console.log('   2. config.jsまたは環境変数が正しく設定されているか')
      console.log('   3. データベース「stockx_arbitrage」が作成されているか')
      process.exit(1)
    }
    
    // スキーマ初期化
    console.log('🗄️ データベーススキーマを初期化中...')
    const schemaInitialized = await initializeSchema()
    
    if (!schemaInitialized) {
      console.error('❌ スキーマ初期化に失敗しました')
      process.exit(1)
    }
    
    console.log('✅ データベース初期化が完了しました！')
    console.log('🎉 アプリケーションを起動できます: npm run dev')
    
  } catch (error) {
    console.error('❌ データベース初期化中にエラーが発生しました:', error.message)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  initDatabase()
}

module.exports = { initDatabase }
