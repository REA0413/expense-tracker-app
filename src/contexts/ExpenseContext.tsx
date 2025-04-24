'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
};

type ExpenseContextType = {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  refreshExpenses: () => Promise<void>;
};

export const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  loading: false,
  error: null,
  refreshExpenses: async () => {},
});

export const ExpenseProvider = ({ children }: { children: ReactNode }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useContext(AuthContext);

  const fetchExpenses = async () => {
    // Only fetch if user is authenticated
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch('/api/expenses');
      
      if (res.status === 401) {
        console.error('Authentication failed when fetching expenses');
        setExpenses([]);
        return;
      }
      
      const { data } = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchExpenses();
  }, []);

  return (
    <ExpenseContext.Provider 
      value={{ 
        expenses, 
        loading, 
        error,
        refreshExpenses: fetchExpenses
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}; 