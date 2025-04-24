import axios from 'axios';

// Replace this with your Alpha Vantage API key (free tier)
// Get a key at: https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = 'demo'; // Use 'demo' for testing or replace with your key

// Top stocks to track
export const TOP_STOCKS = [
  'AAPL', 'MSFT', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 
  'JPM', 'V', 'WMT', 'PG'
];

// Popular forex pairs
export const FOREX_PAIRS = [
  'EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'USD/CAD'
];

// ETFs
export const EUROPEAN_ETFS = [
  'SPY', 'IWM', 'QQQ', 'VGK', 'FEZ'
];

// Replace any with proper types
type StockData = {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
};

// Format stock data from Alpha Vantage
function formatStockQuote(symbol: string, data: any): any {
  if (!data || !data['Global Quote']) return null;
  
  const quote = data['Global Quote'];
  
  return {
    symbol,
    name: symbol, // Alpha Vantage doesn't provide company name in quote endpoint
    price: parseFloat(quote['05. price']) || 0,
    change: parseFloat(quote['09. change']) || 0,
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')) || 0,
    currency: 'USD'
  };
}

// Format forex data
function formatForexQuote(pair: string, data: any): any {
  if (!data || !data['Realtime Currency Exchange Rate']) return null;
  
  const quote = data['Realtime Currency Exchange Rate'];
  const fromCurrency = quote['1. From_Currency Code'];
  const toCurrency = quote['3. To_Currency Code'];
  const rate = parseFloat(quote['5. Exchange Rate']) || 0;
  
  return {
    symbol: `${fromCurrency}/${toCurrency}`,
    name: `${fromCurrency}/${toCurrency}`,
    price: rate,
    change: 0, // Alpha Vantage free tier doesn't provide change in forex endpoint
    changePercent: 0,
    currency: toCurrency
  };
}

// Fetch stock data one by one (Alpha Vantage free tier has rate limits)
export async function fetchTopStocks() {
  const results = [];
  
  // Only fetch a few stocks to avoid rate limits on free tier
  const limitedStocks = TOP_STOCKS.slice(0, 5);
  
  for (const symbol of limitedStocks) {
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const formatted = formatStockQuote(symbol, response.data);
      if (formatted) results.push(formatted);
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
    }
  }
  
  return results;
}

// Fetch forex data
export async function fetchForexRates() {
  const results = [];
  
  // Only fetch a few forex pairs to avoid rate limits
  const limitedPairs = FOREX_PAIRS.slice(0, 3);
  
  for (const pair of limitedPairs) {
    try {
      const [fromCurrency, toCurrency] = pair.split('/');
      
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const formatted = formatForexQuote(pair, response.data);
      if (formatted) results.push(formatted);
    } catch (error) {
      console.error(`Error fetching data for ${pair}:`, error);
    }
  }
  
  return results;
}

// For ETFs, we'll use the same endpoint as stocks but ensure we add a good delay
export async function fetchEuropeanETFs() {
  const results = [];
  
  // Only fetch a few ETFs to avoid rate limits
  const limitedETFs = EUROPEAN_ETFS.slice(0, 3);
  
  for (const symbol of limitedETFs) {
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      // Add a longer delay to avoid hitting rate limits (the free tier is very restrictive)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const formatted = formatStockQuote(symbol, response.data);
      if (formatted) results.push(formatted);
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
    }
  }
  
  // If we have no results, return a mock ETF
  if (results.length === 0) {
    return [{
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF',
      price: 450.23,
      change: 1.25,
      changePercent: 0.28,
      currency: 'USD'
    }];
  }
  
  return results;
}

export const getStockData = async (symbols: string[]): Promise<Record<string, StockData>> => {
  // Implementation placeholder
  const result: Record<string, StockData> = {};
  
  // Return empty result for now
  return result;
}; 