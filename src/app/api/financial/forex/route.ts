import { NextResponse } from 'next/server';
import { fetchForexRates } from '@/lib/financial-data';

export async function GET() {
  try {
    const forex = await fetchForexRates();
    return NextResponse.json({ data: forex }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 