import { NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Helper to get server-side authenticated user
async function getServerUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Server auth error:', error.message);
      return null;
    }
    
    return data.user;
  } catch (err) {
    console.error('Server auth exception:', err);
    return null;
  }
}

// Add new expense
export async function POST(req: Request) {
  const user = await getServerUser();
  console.log('POST /api/expenses - User:', user?.email || 'Not authenticated');
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { amount, category, description, transaction_date } = await req.json();
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ user_id: user.id, amount, category, description, transaction_date }])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get user expenses
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(req: Request) {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const { id } = await req.json();
    const { error } = await supabase
      .from('transactions')
      .delete()
      .match({ id, user_id: user.id });
  
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  
    return NextResponse.json({ success: true }, { status: 200 });
  }
