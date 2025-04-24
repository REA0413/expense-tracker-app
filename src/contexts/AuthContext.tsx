'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<{ error: Error | null }>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  signUp: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from localStorage
    const savedSession = localStorage.getItem('supabase.auth.token');
    if (savedSession) {
      console.log("Found saved session in localStorage");
    }

    // Initial session check
    const initializeAuth = async () => {
      console.log("Running initial auth check...");
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error.message);
          setLoading(false);
          return;
        }
        
        if (data.session) {
          console.log("Session found:", data.session.user.email);
          setUser(data.session.user);
          setSession(data.session);
          
          // Explicitly persist session for debugging
          localStorage.setItem('supabase.auth.token', data.session.access_token);
          localStorage.setItem('expense_tracker_user_email', data.session.user.email || '');
        } else {
          console.log("No active session found");
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.email);
        
        if (event === 'SIGNED_IN' && currentSession) {
          setUser(currentSession.user);
          setSession(currentSession);
          localStorage.setItem('supabase.auth.token', currentSession.access_token);
          localStorage.setItem('expense_tracker_user_email', currentSession.user.email || '');
        }
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('expense_tracker_user_email');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) return { error: error as Error };
      
      if (data.session) {
        // Set session and user state
        setUser(data.session.user);
        setSession(data.session);
        
        // Save session to localStorage (for client reference)
        localStorage.setItem('supabase.auth.token', data.session.access_token);
        
        // Set a cookie that server components can access
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }
      
      return { error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: error as Error };
    }
  };

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('expense_tracker_user_email');
  };

  // Sign up function
  const signUp = async (email: string, password: string, metadata?: UserMetadata) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      return { error };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signOut,
        signUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

type UserMetadata = {
  name?: string;
  [key: string]: unknown;
}; 