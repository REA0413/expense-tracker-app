import { supabase } from './supabase';

export async function getUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session found');
      return null;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user found');
      return null;
    }
    
    console.log('Auth successful:', { user, session });
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
} 