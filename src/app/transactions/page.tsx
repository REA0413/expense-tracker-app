'use client';

import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { Download, Filter, Search, ArrowDown, ArrowUp, Calendar } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TransactionStatus from '@/components/TransactionStatus';
import { formatCurrency } from '@/lib/utils';

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
};

export default function Transactions() {
  const { user, loading: authLoading, signOut } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState<string>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const router = useRouter();

  // Fetch stored expenses
  useEffect(() => {
    async function fetchExpenses() {
      if (!user) return;
      
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
    }
    
    if (user) fetchExpenses();
  }, [user]);

  // Add redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Function to delete an expense
  async function deleteExpense(id: string) {
    try {
      const res = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (res.ok) {
        setExpenses(expenses.filter(expense => expense.id !== id));
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  }

  // Get unique categories from expenses
  const categories = ['All Categories', ...new Set(expenses.map(expense => expense.category))];

  // Handle sort change
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort expenses
  const filterExpenses = () => {
    return expenses
      .filter((expense) => {
        // Apply search filter
        if (searchQuery && !expense.description.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        // Apply category filter
        if (selectedCategory && selectedCategory !== 'All Categories' && expense.category !== selectedCategory) {
          return false;
        }
        
        // Apply date filter
        if (dateRange) {
          const expenseDate = new Date(expense.transaction_date);
          // Adjust the end date to include the entire day
          const endDate = new Date(dateRange[1]);
          endDate.setHours(23, 59, 59, 999);
          
          if (expenseDate < dateRange[0] || expenseDate > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'transaction_date') {
          return sortDirection === 'asc'
            ? new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
            : new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        }
        
        if (sortField === 'amount') {
          return sortDirection === 'asc'
            ? a.amount - b.amount
            : b.amount - a.amount;
        }
        
        // For text fields like description and category
        if (typeof a[sortField as keyof Expense] === 'string' && typeof b[sortField as keyof Expense] === 'string') {
          return sortDirection === 'asc'
            ? (a[sortField as keyof Expense] as string).localeCompare(b[sortField as keyof Expense] as string)
            : (b[sortField as keyof Expense] as string).localeCompare(a[sortField as keyof Expense] as string);
        }
        
        // Fallback for non-string fields
        return 0;
      });
  };

  // Determine transaction status (this would be simplified - in a real app you'd have proper status fields)
  const getTransactionStatus = (date: string) => {
    const transactionDate = new Date(date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff < 1) return 'pending';
    if (daysDiff < 3) return 'settled';
    return 'settled'; // Default all older transactions to settled
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    if (expenses.length === 0) return;
    
    const headers = ['Date', 'Description', 'Category', 'Amount'];
    const csvData = [
      headers.join(','),
      ...filterExpenses().map(expense => [
        new Date(expense.transaction_date).toLocaleDateString(),
        `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes
        expense.category,
        expense.amount.toFixed(2)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update the useEffect with proper dependencies
  useEffect(() => {
    // Check URL parameters for export action
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const dateFilter = urlParams.get('date_filter');
    const categoryFilter = urlParams.get('category');
    
    // Only proceed if we have expenses loaded
    if (expenses.length === 0 || loading) return;
    
    // Handle automatic export if requested
    if (action === 'export') {
      // Apply any filters first
      if (dateFilter) {
        // Apply date filter based on the value
        if (dateFilter === 'this_month') {
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          setDateRange([firstDay, now]);
        } else if (dateFilter === 'last_month') {
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
          setDateRange([firstDay, lastDay]);
        } else if (dateFilter === 'last_30_days') {
          const now = new Date();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          setDateRange([thirtyDaysAgo, now]);
        }
      }
      
      // Apply category filter if specified
      if (categoryFilter) {
        setSelectedCategory(decodeURIComponent(categoryFilter));
      }
      
      // Trigger export after filters are applied
      // Use a longer delay to ensure filters are applied
      setTimeout(() => {
        exportToCSV();
      }, 1500);
    }
  }, [expenses, loading, exportToCSV]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onSignOut={signOut} userName={user?.user_metadata?.name || 'User'} />
      
      <div className="flex-1 ml-0 lg:ml-64 p-6 overflow-y-auto">
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Transactions</h1>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={exportToCSV}
                disabled={expenses.length === 0}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                <Download size={16} className="mr-1" />
                Export CSV
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-64">
                <input 
                  type="text" 
                  placeholder="Search transactions..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              </div>
              
              {/* Date Range Filter */}
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <div className="flex items-center w-full">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600 mr-2">From:</span>
                  <input 
                    type="date" 
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={dateRange ? dateRange[0].toISOString().substring(0, 10) : ''}
                    onChange={(e) => {
                      const fromDate = e.target.value ? new Date(e.target.value) : new Date();
                      const toDate = dateRange ? dateRange[1] : new Date();
                      setDateRange([fromDate, toDate]);
                    }}
                  />
                </div>
                <div className="flex items-center w-full">
                  <span className="text-sm text-gray-600 mr-2 ml-6 sm:ml-0">To:</span>
                  <input 
                    type="date" 
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={dateRange ? dateRange[1].toISOString().substring(0, 10) : ''}
                    onChange={(e) => {
                      const toDate = e.target.value ? new Date(e.target.value) : new Date();
                      const fromDate = dateRange ? dateRange[0] : new Date(toDate);
                      fromDate.setMonth(fromDate.getMonth() - 1); // Default to 1 month back if no previous selection
                      setDateRange([fromDate, toDate]);
                    }}
                  />
                </div>
                {dateRange && (
                  <button 
                    onClick={() => setDateRange(null)} 
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {/* Category Filter */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter size={16} className="text-gray-400" />
                <select 
                  className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Loading transactions...
              </div>
            ) : filterExpenses().length > 0 ? (
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th 
                        className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('transaction_date')}
                      >
                        <div className="flex items-center">
                          <span>Date</span>
                          {sortField === 'transaction_date' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('description')}
                      >
                        <div className="flex items-center">
                          <span>Description</span>
                          {sortField === 'description' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center">
                          <span>Category</span>
                          {sortField === 'category' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center">
                          <span>Amount</span>
                          {sortField === 'amount' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filterExpenses().map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="py-4 px-6 text-sm text-gray-700">
                          {new Date(expense.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700">
                          {expense.description}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700">
                          {expense.category}
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-gray-900">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700">
                          <TransactionStatus status={getTransactionStatus(expense.transaction_date) as any} />
                        </td>
                        <td className="py-4 px-6 text-right text-sm font-medium">
                          <button 
                            onClick={() => deleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No transactions found matching your search.
              </div>
            )}
            
            <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
              Showing {filterExpenses().length} of {expenses.length} total transactions
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 