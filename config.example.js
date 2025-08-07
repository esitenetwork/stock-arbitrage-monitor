// Configuration template - copy to config.js and fill in your values
module.exports = {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'stockx_arbitrage',
    username: 'your_username',
    password: 'your_password'
  },
  apis: {
    rakuten: 'your_rakuten_api_key',
    yahoo: 'your_yahoo_api_key',
    exchangeRate: 'your_exchange_rate_api_key'
  },
  jwt: {
    secret: 'your_jwt_secret_here'
  },
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'your_email@gmail.com',
    pass: 'your_app_password'
  },
  app: {
    port: 3000,
    environment: 'development'
  }
};
