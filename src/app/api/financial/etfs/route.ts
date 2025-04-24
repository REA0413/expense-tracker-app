import { NextResponse } from 'next/server';
import { fetchEuropeanETFs } from '@/lib/financial-data';

export async function GET() {
  try {
    const etfs = await fetchEuropeanETFs();
    
    // If the API returns no data, add mock ETFs
    if (etfs.length === 0) {
      const mockETFs = [
        {
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          price: 450.23,
          change: 1.25,
          changePercent: 0.28,
          currency: 'USD'
        },
        {
          symbol: 'VGK',
          name: 'Vanguard FTSE Europe ETF',
          price: 62.15,
          change: 0.42,
          changePercent: 0.68,
          currency: 'USD'
        },
        {
          symbol: 'EZU',
          name: 'iShares MSCI Eurozone ETF',
          price: 47.83,
          change: -0.31,
          changePercent: -0.64,
          currency: 'USD'
        }
      ];
      
      return NextResponse.json({ data: mockETFs }, { status: 200 });
    }
    
    return NextResponse.json({ data: etfs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 