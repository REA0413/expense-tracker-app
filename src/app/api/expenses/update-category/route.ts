import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { id, category } = await req.json();
    
    const { data, error } = await supabase
      .from('transactions')
      .update({ category })
      .eq('id', id)
      .eq('user_id', user.id)
      .select();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 