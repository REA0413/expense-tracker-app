'use client';

import { useEffect, useState, useContext, useRef } from 'react';
import { PieChart as RechartsChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useRouter } from "next/navigation";
import { AuthContext } from '@/contexts/AuthContext';
import { predictCategory, predictCategoryWithModel, recordUserCorrection, CATEGORIES } from '@/lib/categorization';
import Tesseract from 'tesseract.js';
import { PlaidLink } from 'react-plaid-link';
import { handlePlaidSuccess, fetchPlaidTransactions } from '@/lib/plaid';
import FinancialMarkets from '@/components/FinancialMarkets';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TransactionStatus from '@/components/TransactionStatus';
import { Calendar, Wallet, TrendingUp, TrendingDown, Plus, DollarSign, CreditCard, RefreshCw, PieChart as PieChartIcon } from 'lucide-react';
import ReceiptScanner from '@/components/ReceiptScanner';
import TopBar from '@/components/TopBar';
import { formatCurrency } from '@/lib/utils';

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
};

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [transaction_date, setTransaction_date] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [plaidLinked, setPlaidLinked] = useState(false);
  const [plaidInstitution, setPlaidInstitution] = useState('');
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Add state for summary metrics
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalSpent: 0,
    monthlyAverage: 0,
    largestExpense: 0,
    thisMonth: 0,
    categoriesCount: 0
  });

  // Fetch stored expenses
  useEffect(() => {
    async function fetchExpenses() {
      if (!user) return;
      
      try {
        setLoading(true);
        const res = await fetch('/api/expenses');
        
        // Don't automatically redirect on 401, just show an error
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
  }, [user, router]);

  // Add redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Add this effect to make the chart render
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate summary metrics when expenses change
  useEffect(() => {
    if (expenses.length > 0) {
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const largest = Math.max(...expenses.map(exp => exp.amount));
      
      // Get current month expenses
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const thisMonthExpenses = expenses.filter(exp => {
        const date = new Date(exp.transaction_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      
      const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Get unique categories
      const uniqueCategories = new Set(expenses.map(exp => exp.category));
      
      setSummaryMetrics({
        totalSpent: total,
        monthlyAverage: total / (thisMonthExpenses.length > 0 ? 1 : 3), // Simplified monthly avg calculation
        largestExpense: largest,
        thisMonth: thisMonthTotal,
        categoriesCount: uniqueCategories.size
      });
    }
  }, [expenses]);

  // Function to add a new expense
  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, category, description, transaction_date }),
    });
    if (res.ok) {
      setAmount('');
      setCategory('');
      setDescription('');
      setTransaction_date('');
      window.location.reload(); // Refresh the page to fetch new expenses
    }
  }

  // Function to delete an expense
  async function deleteExpense(id: string) {
    await fetch('/api/expenses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    window.location.reload();
  }

  // Prepare data for Pie Chart
  const categories = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});
  

  const chartData = Object.keys(categories).map((category) => ({
    name: category,
    value: categories[category],
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Add logout function
  async function handleLogout() {
    await signOut();
    router.push('/auth/login');
  }

  // Add this function for auto-categorization
  const autoCategorize = async (desc: string) => {
    try {
      // First try the fast rule-based approach
      const predicted = predictCategory(desc);
      setCategory(predicted);
      
      // Then try the model-based approach if available
      if (isModelLoaded) {
        const modelPrediction = await predictCategoryWithModel(desc);
        setCategory(modelPrediction);
      }
    } catch (error) {
      console.error('Error in auto-categorization:', error);
    }
  };

  // Add a function to handle category correction
  const handleCategoryCorrection = async (id: string, description: string, currentCategory: string, newCategory: string) => {
    if (currentCategory !== newCategory) {
      try {
        await recordUserCorrection(description, newCategory);
        
        // Update the expense in the backend
        const res = await fetch('/api/expenses/update-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, category: newCategory }),
        });
        
        if (res.ok) {
          // Update local state to show the feedback was given
          setFeedbackGiven(prev => ({ ...prev, [id]: true }));
          
          // Also update the category in the local state
          setExpenses(prev => prev.map(exp => 
            exp.id === id ? { ...exp, category: newCategory } : exp
          ));
          
          alert(`Thanks for your feedback! We'll improve our predictions for "${description}".`);
        }
      } catch (error) {
        console.error('Error recording correction:', error);
      }
    }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsScanning(true);
    
    try {
      // Use Tesseract.js to recognize text in the image
      const result = await Tesseract.recognize(
        file,
        'eng', // English language
        { logger: m => console.log(m) }
      );
      
      const text = result.data.text;
      setScanResults(text);
      
      // Try to extract information from the receipt
      const amountMatch = text.match(/\$?(\d+\.\d{2})/); // Look for dollar amounts
      const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/); // Look for dates
      
      // Extract merchant name (first line often has the merchant name)
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const merchantName = lines.length > 0 ? lines[0].trim() : '';
      
      // Set values in the form
      if (amountMatch && amountMatch[1]) {
        setAmount(amountMatch[1]);
      }
      
      if (dateMatch) {
        const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        const month = dateMatch[1].padStart(2, '0');
        const day = dateMatch[2].padStart(2, '0');
        setTransaction_date(`${year}-${month}-${day}`);
      }
      
      if (merchantName) {
        setDescription(merchantName);
        // Auto-categorize based on the merchant name
        autoCategorize(merchantName);
      }
    } catch (error) {
      console.error('Error scanning receipt:', error);
    } finally {
      setIsScanning(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onPlaidSuccess = async (public_token: string, metadata: any) => {
    const result = await handlePlaidSuccess(public_token, metadata);
    if (result.success) {
      setPlaidLinked(true);
      setPlaidInstitution(result.institutionName ?? 'Your Bank');
    }
  };

  const importTransactions = async () => {
    setLoadingTransactions(true);
    try {
      // Get transactions from last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const transactions = await fetchPlaidTransactions(startDate, endDate);
      
      // Bulk add transactions
      const result = await fetch('/api/expenses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions })
      });
      
      if (result.ok) {
        window.location.reload(); // Refresh to show new transactions
      }
    } catch (error) {
      console.error('Error importing transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
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

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar onSignOut={signOut} userName={user?.user_metadata?.name || 'User'} />
        
        <div className="flex-1 ml-0 lg:ml-64 p-6 overflow-y-auto">
          <Header 
            userName={user?.user_metadata?.name || 'User'} 
            userEmail={user?.email || ''} 
            onSignOut={signOut} 
          />
          
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-midtrans-bg flex">
      <Sidebar onSignOut={signOut} userName={user?.email?.split('@')[0] || 'User'} />
      
      <div className="flex-1 lg:ml-64 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <TopBar 
            userName={user?.email?.split('@')[0] || 'User'} 
            userEmail={user?.email || 'user@example.com'} 
            onSignOut={signOut} 
          />
          
          {/* Top metrics cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full text-blue-500 mr-3">
                  <Wallet size={22} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Spent</div>
                  <div className="font-semibold text-2xl">{formatCurrency(summaryMetrics.totalSpent)}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full text-green-500 mr-3">
                  <Calendar size={22} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">This Month</div>
                  <div className="font-semibold text-2xl">{formatCurrency(summaryMetrics.thisMonth)}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full text-purple-500 mr-3">
                  <PieChartIcon size={22} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Categories</div>
                  <div className="font-semibold text-2xl">{summaryMetrics.categoriesCount}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow border-l-4 border-orange-500">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-full text-orange-500 mr-3">
                  <DollarSign size={22} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Largest Expense</div>
                  <div className="font-semibold text-2xl">{formatCurrency(summaryMetrics.largestExpense)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Add New Expense Form - adjust height to match analytics */}
            <div className="bg-white rounded-lg shadow p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Add New Expense</h2>
              </div>
              
              <form onSubmit={addExpense} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">£</span>
                      </div>
                      <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      id="transaction_date"
                      value={transaction_date}
                      onChange={(e) => setTransaction_date(e.target.value)}
                      required
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      id="description"
                      value={description}
                      onChange={(e) => {
                        const newDescription = e.target.value;
                        setDescription(newDescription);
                        
                        // Auto-categorize when description changes
                        if (newDescription.trim().length > 3) {
                          const predictedCategory = predictCategory(newDescription);
                          // Always update category based on current text
                          setCategory(predictedCategory || 'Other');
                        } else if (newDescription.trim().length === 0) {
                          // Clear category if description is empty
                          setCategory('');
                        }
                      }}
                      required
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="e.g. Grocery shopping"
                    />
                  </div>
                </div>
                
                <div className="mt-12">
                  <ReceiptScanner 
                    onScanComplete={(data) => {
                      if (data.amount) setAmount(data.amount);
                      if (data.date) setTransaction_date(data.date);
                      if (data.merchant) {
                        setDescription(data.merchant);
                        // Auto-categorize based on the merchant name
                        const predictedCategory = predictCategory(data.merchant);
                        setCategory(predictedCategory);
                      }
                    }} 
                  />
                </div>
                
                <div className="mt-12 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
            
            {/* Charts and Graphs */}
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Expense Analytics</h2>
                <button className="text-gray-500 hover:text-gray-700 p-2">
                  <RefreshCw size={16} />
                </button>
              </div>
              
              {/* Expense Pie Chart - Stack vertically */}
              {isClient && expenses.length > 0 && (
                <div className="flex flex-col">
                  <div className="w-full mb-8">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Spending by Category</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <RechartsChart>
                        <Pie 
                          data={chartData} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={75} 
                          fill="#8884d8"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </RechartsChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="w-full">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Spending Trend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={expenses
                        // Sort by date (oldest first) and take the first 5
                        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
                        .slice(0, 5)
                        .map(exp => ({
                          date: new Date(exp.transaction_date).toLocaleDateString(),
                          amount: exp.amount
                        }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: '11px' }} />
                        <YAxis style={{ fontSize: '11px' }} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="amount" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              {expenses.length === 0 && (
                <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
                  <p>No expenses found. Add your first expense to see analytics.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
            </div>
            
            {expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses
                      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                      .slice(0, 5)
                      .map((expense) => (
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
              <div className="p-6 text-gray-500">
                No transactions found. Add your first expense.
              </div>
            )}
            
            {expenses.length > 5 && (
              <div className="p-4 border-t border-gray-200 text-center">
                <button 
                  onClick={() => router.push('/transactions')}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                >
                  View All Transactions
                </button>
              </div>
            )}
          </div>
          
          {/* Bank Connection Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">🏦 Connect Your Bank</h2>
            </div>
            
            {!plaidLinked ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your bank account to automatically import transactions.
                </p>
                
                <PlaidLink
                  token="link-sandbox-1234-placeholder"
                  onSuccess={onPlaidSuccess}
                  onExit={() => {}}
                  className="inline-flex items-center bg-green-600 text-black px-4 py-2 rounded hover:bg-green-700"
                >
                  <CreditCard size={16} className="mr-2" />
                  Connect Bank Account
                </PlaidLink>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  ✓ Connected to {plaidInstitution}
                </p>
                
                <button
                  onClick={importTransactions}
                  disabled={loadingTransactions}
                  className="inline-flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loadingTransactions ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} className="mr-2" />
                      Import Transactions
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Financial Markets Component */}
          <FinancialMarkets />
        </div>
      </div>
    </div>
  );
}
