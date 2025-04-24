import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { transactions } = await req.json();
    
    // Map the transactions to the format expected by the database
    const formattedTransactions = transactions.map((transaction: any) => ({
      user_id: user.id,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.name,
      transaction_date: transaction.date
    }));
    
    // Insert all transactions
    const { data, error } = await supabase
      .from('transactions')
      .insert(formattedTransactions)
      .select();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 