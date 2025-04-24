'use client';

import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, ExternalLink } from 'lucide-react';

type MarketData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
};

export default function FinancialMarkets() {
  const [stocks, setStocks] = useState<MarketData[]>([]);
  const [forex, setForex] = useState<MarketData[]>([]);
  const [etfs, setETFs] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [apiLimited, setApiLimited] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Fetch financial data
  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stocks
      const stocksRes = await fetch('/api/financial/stocks');
      if (stocksRes.ok) {
        const { data } = await stocksRes.json();
        setStocks(data);
        if (data.length === 0) setApiLimited(true);
      }
      
      // Fetch forex
      const forexRes = await fetch('/api/financial/forex');
      if (forexRes.ok) {
        const { data } = await forexRes.json();
        setForex(data);
      }
      
      // Fetch ETFs
      const etfsRes = await fetch('/api/financial/etfs');
      if (etfsRes.ok) {
        const { data } = await etfsRes.json();
        setETFs(data);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to load financial data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };
  
  // Render financial data table
  const renderTable = (data: MarketData[]) => {
    if (data.length === 0) {
      return (
        <div className="p-6 text-center text-gray-500">
          {apiLimited 
            ? "Limited data available with demo API key." 
            : "No data available."}
        </div>
      );
    }
    
    return (
      <div className="px-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.symbol + index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 text-sm font-medium text-gray-900">
                  {item.symbol}
                </td>
                <td className="py-3 text-sm text-gray-500">
                  {item.name}
                </td>
                <td className="py-3 text-sm text-right text-gray-900">
                  {item.currency === 'USD' ? '£' : item.currency} {item.price.toFixed(2)}
                </td>
                <td className="py-3 text-sm text-right">
                  <span className={`inline-flex items-center ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                    <span>{item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <DollarSign size={20} className="mr-2 text-blue-500" />
          Financial Markets
        </h2>
        
        <div className="flex space-x-2">
          <a 
            href="https://www.alphavantage.co/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 p-2 rounded flex items-center text-xs"
          >
            <span className="mr-1">Data Source</span>
            <ExternalLink size={14} />
          </a>
          
          <button 
            onClick={handleRefresh} 
            disabled={loading || refreshing}
            className="text-gray-500 hover:text-gray-700 p-2 rounded"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {loading && !refreshing && (
        <div className="p-6 text-center text-gray-500">
          <div className="flex justify-center">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
          </div>
          <p className="mt-2">Loading financial data...</p>
        </div>
      )}
      
      {error && (
        <div className="p-6 text-center text-red-500">
          <p>{error}</p>
        </div>
      )}
      
      {apiLimited && (
        <div className="mx-6 mt-4 text-amber-600 text-sm p-3 bg-amber-50 rounded">
          <p>
            <strong>Note:</strong> Using demo API key with limited data. For more data, 
            replace the API key in <code>src/lib/financial-data.ts</code> with your own 
            free API key from <a href="https://www.alphavantage.co/support/#api-key" className="underline" target="_blank" rel="noopener">Alpha Vantage</a>.
          </p>
        </div>
      )}
      
      {!loading && !refreshing && !error && (
        <div className="py-4">
          <Tab.Group onChange={setActiveTab}>
            <Tab.List className="flex border-b mx-6">
              <Tab 
                className={({ selected }) => 
                  `px-4 py-2 text-sm font-medium border-b-2 ${
                    selected 
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                Stocks
              </Tab>
              <Tab 
                className={({ selected }) => 
                  `px-4 py-2 text-sm font-medium border-b-2 ${
                    selected 
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                Forex
              </Tab>
              <Tab 
                className={({ selected }) => 
                  `px-4 py-2 text-sm font-medium border-b-2 ${
                    selected 
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                European ETFs
              </Tab>
            </Tab.List>
            <Tab.Panels className="mt-2">
              <Tab.Panel>{renderTable(stocks)}</Tab.Panel>
              <Tab.Panel>{renderTable(forex)}</Tab.Panel>
              <Tab.Panel>{renderTable(etfs)}</Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      )}
      
      <div className="px-6 py-3 text-xs text-gray-500 text-right border-t">
        <div className="flex items-center justify-end">
          <div className="mr-2">Last updated:</div>
          <div>{lastUpdated.toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
} 