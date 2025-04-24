'use client';

import { useState, useRef, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, X, Send, Upload } from 'lucide-react';
import { ExpenseContext } from '@/contexts/ExpenseContext';
import { formatCurrency } from '@/lib/utils';

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

type ChatBotProps = {
  expenses?: any[];
};

export default function ChatBot() {
  const { expenses } = useContext(ExpenseContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi there! I can help you find transactions, generate csv report, or create invoices. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSend = () => {
    if (input.trim() === '') return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Process the message and generate a response
    setTimeout(() => {
      processUserMessage(userMessage.text);
      setIsProcessing(false);
    }, 1000);
  };

  const processUserMessage = (text: string) => {
    const lowerText = text.toLowerCase();
    const lastBotMessage = [...messages].reverse().find(m => m.sender === 'bot')?.text || '';
    
    console.log("Processing message:", lowerText);
    console.log("Available expenses:", expenses);
    
    // Case 1: User is asking about transactions or mentioning any potential purchase
    if (
      lowerText.includes('transaction') ||
      lowerText.includes('expense') ||
      lowerText.includes('spending') ||
      lowerText.includes('paid') ||
      lowerText.includes('purchase') ||
      // Check if the query contains words that aren't common English words
      lowerText.split(' ').some(word => word.length > 3 && !commonWords.includes(word))
    ) {
      // Find relevant transactions with improved search
      let relevantTransactions: Expense[] = [];
      
      // Check if we have expenses data
      if (!expenses || expenses.length === 0) {
        addBotMessage("I don't have any transaction data to search through. Please try again later.");
        return;
      }
      
      // DIRECT SEARCH - first check for exact matches in description/category
      const searchTerms = lowerText.split(/\s+/).filter(term => term.length > 3);
      console.log("Search terms:", searchTerms);
      
      // Perform a more flexible search for each word in the user's query
      for (const term of searchTerms) {
        // Look for matches in transaction descriptions and categories
        const matchingTransactions = expenses.filter(exp => {
          const description = exp.description.toLowerCase();
          const category = exp.category.toLowerCase();
          
          // Check if any part of the description or category contains the search term
          return description.includes(term) || category.includes(term);
        });
        
        if (matchingTransactions.length > 0) {
          relevantTransactions = [...relevantTransactions, ...matchingTransactions];
        }
      }
      
      // If no matches found by terms, try the entire query as one phrase
      if (relevantTransactions.length === 0) {
        relevantTransactions = expenses.filter(exp => {
          const description = exp.description.toLowerCase();
          const category = exp.category.toLowerCase();
          
          return description.includes(lowerText) || category.includes(lowerText);
        });
      }
      
      // Remove duplicates
      relevantTransactions = Array.from(new Set(relevantTransactions.map(t => t.id)))
        .map(id => relevantTransactions.find(t => t.id === id)!)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      
      console.log("Found transactions:", relevantTransactions);
      
      // Search for amount
      const amountMatch = lowerText.match(/£?\s?(\d+)/);
      if (amountMatch && expenses.length > 0) {
        const amount = parseFloat(amountMatch[1]);
        relevantTransactions = expenses.filter(
          (exp) => Math.abs(exp.amount - amount) < 10
        );
      }
      
      // Search for category
      const categories = ['food', 'transport', 'utilities', 'entertainment', 'shopping'];
      for (const category of categories) {
        if (lowerText.includes(category) && expenses.length > 0) {
          const matchingExpenses = expenses.filter(
            (exp) => exp.category.toLowerCase().includes(category)
          );
          relevantTransactions = [...relevantTransactions, ...matchingExpenses];
        }
      }
      
      // Search for date keywords
      if (lowerText.includes('today') && expenses.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const todayExpenses = expenses.filter(
          (exp) => exp.transaction_date.startsWith(today)
        );
        relevantTransactions = [...relevantTransactions, ...todayExpenses];
      }
      
      if (relevantTransactions.length > 0) {
        // Found relevant transactions
        const botResponse = `I found ${relevantTransactions.length} relevant transaction${relevantTransactions.length > 1 ? 's' : ''}. Here's the most recent one:
        
Amount: ${formatCurrency(relevantTransactions[0].amount)}
Date: ${new Date(relevantTransactions[0].transaction_date).toLocaleDateString()}
Category: ${relevantTransactions[0].category}
Description: ${relevantTransactions[0].description}

Would you like to see all your transactions?`;

        addBotMessage(botResponse);
      } else {
        // No relevant transactions found
        addBotMessage(
          "I couldn't find any transactions matching your query. Would you like to go to the transactions page to browse all your transactions?"
        );
      }
      return;
    }
    
    // Case 2: User wants to create an invoice
    if (
      lowerText.includes('invoice') ||
      lowerText.includes('bill') ||
      lowerText.includes('receipt')
    ) {
      if (lowerText.includes('create') || lowerText.includes('new') || lowerText.includes('make')) {
        addBotMessage(
          "Sure! I can help you create a new invoice. You can either upload an invoice document or I can take you to the invoice creation page. What would you prefer?"
        );
      } else if (lowerText.includes('upload')) {
        addBotMessage(
          "Great! Please upload your invoice document and I'll help process it."
        );
        // Trigger file upload
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      } else {
        addBotMessage(
          "I can help you with invoices. Would you like to create a new invoice or upload an existing one?"
        );
      }
      return;
    }
    
    // Case 3: User wants to go to a specific page
    if (lowerText.includes('go to') || lowerText.includes('navigate to') || lowerText.includes('show me')) {
      if (lowerText.includes('transaction')) {
        addBotMessage("I'll take you to the transactions page right away!");
        setTimeout(() => router.push('/transactions'), 1000);
        return;
      }
      
      if (lowerText.includes('invoice')) {
        addBotMessage("I'll take you to the invoices page right away!");
        setTimeout(() => router.push('/invoices'), 1000);
        return;
      }
      
      if (lowerText.includes('dashboard')) {
        addBotMessage("I'll take you to the dashboard right away!");
        setTimeout(() => router.push('/dashboard'), 1000);
        return;
      }
    }
    
    // Case 4: User agrees to suggestion
    if (lowerText.includes('yes') || lowerText.includes('sure') || lowerText.includes('ok')) {
      if (lastBotMessage.includes('transactions')) {
        addBotMessage("Great! I'll take you to the transactions page.");
        setTimeout(() => router.push('/transactions'), 1000);
        return;
      }
      
      if (lastBotMessage.includes('invoice')) {
        addBotMessage("Great! I'll take you to the invoices page with your processed invoice.");
        setTimeout(() => {
          sessionStorage.setItem('chatbotRedirected', 'true');
          router.push('/invoices?source=chatbot');
        }, 1000);
        return;
      }
    }
    
    // Look for CSV export requests
    if (
      lowerText.includes('csv') || 
      lowerText.includes('export') || 
      lowerText.includes('download') || 
      lowerText.includes('file') ||
      lowerText.includes('report') ||
      (lowerText.includes('get') && lowerText.includes('transactions'))
    ) {
      // Check if it's a request for customized export
      const wantsCustomization = 
        lowerText.includes('filter') || 
        lowerText.includes('customize') || 
        lowerText.includes('specific') || 
        lowerText.includes('date') || 
        lowerText.includes('category') ||
        lowerText.includes('custom');
      
      if (wantsCustomization) {
        addBotMessage(
          "I can help you export a customized CSV file of your transactions. What would you like to filter by?\n\n" +
            "1. Date range (e.g., 'last month', 'May 2023')\n" +
            "2. Category (e.g., 'food', 'transport')\n" +
            "3. Both date and category"
        );
      } else {
        addBotMessage(
          "I can help you export your transactions as a CSV file. Would you like to:\n\n" +
            "1. Export all transactions\n" +
            "2. Create a customized export with filters"
        );
      }
      return;
    }

    // Handle responses to CSV export options
    if (
      (lastBotMessage?.includes('export your transactions') || 
       lastBotMessage?.includes('customized CSV file')) && 
      (lowerText === '1' || lowerText.includes('all') || lowerText.includes('export all'))
    ) {
      addBotMessage("I'll take you to the transactions page where you can export all your transactions as a CSV file.");
      setTimeout(() => router.push('/transactions?action=export'), 1000);
      return;
    }

    // Add handler for option 2
    if (
      lastBotMessage?.includes('export your transactions') && 
      (lowerText === '2' || lowerText.includes('custom') || lowerText.includes('filter'))
    ) {
      addBotMessage(
        "I can help you export a customized CSV file of your transactions. What would you like to filter by?\n\n" +
        "1. Date range (e.g., 'last month', 'May 2023')\n" +
        "2. Category (e.g., 'food', 'transport')\n" +
        "3. Both date and category"
      );
      return;
    }

    // Handle date range filter request
    if (
      lastBotMessage?.includes('filter by') && 
      (lowerText.includes('1') || lowerText.includes('date') || lowerText.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/))
    ) {
      addBotMessage(
        "What date range would you like to export? You can say things like:\n\n" +
          "- 'This month'\n" +
          "- 'Last 30 days'\n" +
          "- 'January to March 2023'"
      );
      return;
    }

    // Handle category filter request
    if (
      lastBotMessage?.includes('filter by') && 
      (lowerText.includes('2') || lowerText.includes('category'))
    ) {
      // Extract available categories from expenses
      const availableCategories = [...new Set(expenses.map(exp => exp.category))];
      
      addBotMessage(
        `Which category would you like to export? Available categories include:\n\n${
          availableCategories.map(cat => `- ${cat}`).join('\n')
        }\n\nOr just type the name of the category you want.`
      );
      return;
    }

    // Handle date range specification
    if (lastBotMessage?.includes('date range would you like')) {
      // Extract date range (in a real app, you'd use a more sophisticated date parser)
      let dateFilter = '';
      
      if (lowerText.includes('this month')) {
        dateFilter = 'this_month';
      } else if (lowerText.includes('last month')) {
        dateFilter = 'last_month';
      } else if (lowerText.includes('30 days') || lowerText.includes('thirty days')) {
        dateFilter = 'last_30_days';
      } else {
        // Use the user's text as is
        dateFilter = encodeURIComponent(lowerText);
      }
      
      addBotMessage(`Great! I'll take you to the transactions page filtered by ${lowerText} where you can export your CSV.`);
      setTimeout(() => router.push(`/transactions?action=export&date_filter=${dateFilter}`), 1000);
      return;
    }

    // Handle category specification
    if (lastBotMessage?.includes('Which category would you like')) {
      const category = encodeURIComponent(lowerText);
      
      addBotMessage(`Perfect! I'll take you to the transactions page filtered by the "${lowerText}" category where you can export your CSV.`);
      setTimeout(() => router.push(`/transactions?action=export&category=${category}`), 1000);
      return;
    }
    
    // Default response
    addBotMessage(
      "I'm sorry, I'm not sure how to help with that. I can help you find transactions, generate csv report, or create invoices. Would you like to know more about either of these?"
    );
  };

  const addBotMessage = (text: string) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    addBotMessage(`Processing your file: ${file.name}...`);
    
    // Store in session storage to share with invoice page
    const fileInfo = {
      name: file.name,
      type: file.type,
      timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('pendingInvoiceFile', JSON.stringify(fileInfo));
    
    // Read file as data URL to pass to invoice page
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        sessionStorage.setItem('pendingInvoiceData', event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // Simulate processing
    setTimeout(() => {
      addBotMessage(
        "I've processed your invoice! Would you like me to take you to the invoices page to review and finalize it?"
      );
    }, 2000);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Add this array of common words to avoid false positives
  const commonWords = [
    'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
    'his', 'from', 'they', 'she', 'will', 'would', 'there', 'their', 'what',
    'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take',
    'person', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'other',
    'than', 'then', 'look', 'only', 'come', 'over', 'think', 'also'
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Toggle Button */}
      <button
        onClick={toggleChat}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        } transition-colors duration-200 focus:outline-none`}
      >
        {isOpen ? <X size={24} color="white" /> : <MessageSquare size={24} color="white" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-96 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="bg-blue-500 text-white px-4 py-3 font-medium flex justify-between items-center">
            <span>Expense Assistant</span>
            <button onClick={toggleChat} className="focus:outline-none">
              <X size={18} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 max-w-xs ${
                  message.sender === 'user' ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div
                  className={`p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">{message.text}</div>
                </div>
                <div
                  className={`text-xs mt-1 text-gray-500 ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 p-3 flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-blue-500"
              title="Upload file"
            >
              <Upload size={20} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              disabled={isProcessing}
            />
            <button
              onClick={handleSend}
              disabled={input.trim() === '' || isProcessing}
              className={`ml-2 p-2 rounded-full ${
                input.trim() === '' || isProcessing
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 