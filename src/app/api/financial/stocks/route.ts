import { NextResponse } from 'next/server';
import { fetchTopStocks } from '@/lib/financial-data';

export async function GET() {
  try {
    const stocks = await fetchTopStocks();
    return NextResponse.json({ data: stocks }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 