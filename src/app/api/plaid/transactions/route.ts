import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { predictCategory } from '@/lib/categorization';

// Mock transactions - in a real app, you would use the Plaid API
const MOCK_TRANSACTIONS = [
  { date: '2023-06-15', name: 'Starbucks', amount: 4.95 },
  { date: '2023-06-15', name: 'Amazon', amount: 29.99 },
  { date: '2023-06-14', name: 'Uber', amount: 12.50 },
  { date: '2023-06-12', name: 'Walmart', amount: 65.24 },
  { date: '2023-06-10', name: 'Netflix', amount: 13.99 }
];

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { accessToken, startDate, endDate } = await req.json();
    
    // In a real app, you would verify the access token belongs to this user
    // and make a call to the Plaid API to get real transactions
    
    // Auto-categorize the mock transactions
    const categorizedTransactions = MOCK_TRANSACTIONS.map(transaction => ({
      ...transaction,
      category: predictCategory(transaction.name)
    }));
    
    return NextResponse.json({ 
      transactions: categorizedTransactions 
    }, { status: 200 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 