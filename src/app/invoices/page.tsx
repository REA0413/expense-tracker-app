'use client';

import { useState, useRef, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Plus, 
  Calendar, 
  Clock, 
  Link as LinkIcon, 
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Loader,
  Eye,
  Printer,
  Download
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Tesseract from 'tesseract.js';
import TopBar from '@/components/TopBar';
import * as pdfjs from 'pdfjs-dist';
import { formatCurrency } from '@/lib/utils';

type InvoiceItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  amount: number;
};

type InvoiceForm = {
  type: 'SENT' | 'RECEIVED';
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverAddress: string;
  date: string;
  items: InvoiceItem[];
  paymentLink: string;
  paymentDeadline: string;
};

export default function Invoices() {
  const { user, loading: authLoading, signOut } = useContext(AuthContext);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  const [invoice, setInvoice] = useState<InvoiceForm>({
    type: 'SENT',
    senderName: '',
    senderAddress: '',
    receiverName: '',
    receiverAddress: '',
    date: new Date().toISOString().substring(0, 10),
    items: [{ id: 1, name: '', quantity: 1, price: 0, amount: 0 }],
    paymentLink: '',
    paymentDeadline: ''
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvoice(prev => ({ ...prev, [name]: value }));
  };

  // Handle item changes
  const handleItemChange = (id: number, field: keyof InvoiceItem, value: string | number) => {
    setInvoice(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate amount if quantity or price changes
          if (field === 'quantity' || field === 'price') {
            updatedItem.amount = updatedItem.quantity * updatedItem.price;
          }
          
          return updatedItem;
        }
        return item;
      });
      
      return { ...prev, items: updatedItems };
    });
  };

  // Add new item (up to 5)
  const addItem = () => {
    if (invoice.items.length < 5) {
      const newId = Math.max(...invoice.items.map(item => item.id), 0) + 1;
      setInvoice(prev => ({
        ...prev,
        items: [...prev.items, { id: newId, name: '', quantity: 1, price: 0, amount: 0 }]
      }));
    }
  };

  // Remove item
  const removeItem = (id: number) => {
    if (invoice.items.length > 1) {
      setInvoice(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return invoice.items.reduce((sum, item) => sum + item.amount, 0);
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Just alert for now as we don't have Supabase table yet
    alert('This feature is under development. Invoice data would be saved here.');
    console.log('Invoice data:', invoice);
  };

  // Handle invoice OCR scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Check if it's a PDF
      if (file.type === 'application/pdf') {
        alert("PDF extraction is under development. For best results, please upload an image of your invoice (JPG, PNG).");
        setScanProgress(1); // Complete the progress bar
      } else {
        // Use Tesseract for images
        const result = await Tesseract.recognize(
          file,
          'eng',
          { 
            logger: m => {
              if (m.status === 'recognizing text') {
                setScanProgress(m.progress);
              }
            } 
          }
        );
        
        // Process the extracted text as before
        const text = result.data.text;
        
        // Try to extract invoice information
        // This is a simple implementation - in a real app, you'd use more sophisticated NLP
        const invoiceType = text.toLowerCase().includes('received') ? 'RECEIVED' : 'SENT';
        
        // Extract possible date (simple regex for date format)
        const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        let extractedDate = '';
        if (dateMatch) {
          const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
          const month = dateMatch[1].padStart(2, '0');
          const day = dateMatch[2].padStart(2, '0');
          extractedDate = `${year}-${month}-${day}`;
        }
        
        // Extract company names (very simplistic approach)
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const possibleSenderName = lines.length > 0 ? lines[0].trim() : '';
        const possibleReceiverName = lines.length > 3 ? lines[3].trim() : '';
        
        // Extract amounts (look for currency symbols and numbers)
        const amountMatches = text.match(/[£$€]\s?(\d+\.\d{2})/g) || [];
        const amounts = amountMatches.map(match => {
          const numStr = match.replace(/[£$€\s]/g, '');
          return parseFloat(numStr);
        });
        
        // Create extracted items
        const extractedItems: InvoiceItem[] = [];
        
        // If we found amounts, create simple items
        if (amounts.length > 0) {
          amounts.slice(0, 5).forEach((amount, index) => {
            extractedItems.push({
              id: index + 1,
              name: `Item ${index + 1}`,
              quantity: 1,
              price: amount,
              amount: amount
            });
          });
        } else {
          // Default item if no amounts found
          extractedItems.push({ id: 1, name: '', quantity: 1, price: 0, amount: 0 });
        }
        
        // Update form with extracted data
        setInvoice({
          type: invoiceType as 'SENT' | 'RECEIVED',
          senderName: possibleSenderName,
          senderAddress: '',
          receiverName: possibleReceiverName,
          receiverAddress: '',
          date: extractedDate || new Date().toISOString().substring(0, 10),
          items: extractedItems,
          paymentLink: '',
          paymentDeadline: ''
        });
        
        // Switch to manual tab to let user review and edit the extracted data
        setActiveTab('manual');
      }
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  // Add to the useEffect in your invoice page
  useEffect(() => {
    // Check if we've been redirected from chatbot with a file
    const chatbotRedirected = sessionStorage.getItem('chatbotRedirected');
    const pendingFileInfo = sessionStorage.getItem('pendingInvoiceFile');
    const pendingFileData = sessionStorage.getItem('pendingInvoiceData');
    
    if (chatbotRedirected && pendingFileInfo && pendingFileData) {
      // Clear the redirect flag
      sessionStorage.removeItem('chatbotRedirected');
      
      // Set active tab to upload
      setActiveTab('upload');
      
      // Process the file
      const fileInfo = JSON.parse(pendingFileInfo);
      
      // Create a file from the data URL
      const dataURLToFile = (dataUrl: string, fileName: string, fileType: string): File => {
        const arr = dataUrl.split(',');
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        
        return new File([u8arr], fileName, { type: fileType });
      };
      
      const file = dataURLToFile(pendingFileData, fileInfo.name, fileInfo.type);
      
      // Trigger file processing as if it was uploaded directly
      processUploadedFile(file);
      
      // Clear the storage
      sessionStorage.removeItem('pendingInvoiceFile');
      sessionStorage.removeItem('pendingInvoiceData');
    }
  }, []);

  // Update the processUploadedFile function
  const processUploadedFile = async (file: File) => {
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Use the same OCR logic you have in your existing handleFileUpload
      if (file.type === 'application/pdf') {
        alert("PDF extraction is under development. For best results, please upload an image of your invoice (JPG, PNG).");
        setScanProgress(1);
      } else {
        const result = await Tesseract.recognize(
          file,
          'eng',
          { 
            logger: m => {
              if (m.status === 'recognizing text') {
                setScanProgress(m.progress);
              }
            } 
          }
        );
        
        const text = result.data.text;
        
        // Use your existing extraction logic
        const invoiceType = text.toLowerCase().includes('received') ? 'RECEIVED' : 'SENT';
        
        // Extract possible date (simple regex for date format)
        const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        let extractedDate = '';
        if (dateMatch) {
          const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
          const month = dateMatch[1].padStart(2, '0');
          const day = dateMatch[2].padStart(2, '0');
          extractedDate = `${year}-${month}-${day}`;
        }
        
        // Extract company names
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const possibleSenderName = lines.length > 0 ? lines[0].trim() : '';
        const possibleReceiverName = lines.length > 3 ? lines[3].trim() : '';
        
        // Extract amounts
        const amountMatches = text.match(/[£$€]\s?(\d+\.\d{2})/g) || [];
        const amounts = amountMatches.map(match => {
          const numStr = match.replace(/[£$€\s]/g, '');
          return parseFloat(numStr);
        });
        
        // Create extracted items
        const extractedItems: InvoiceItem[] = [];
        
        if (amounts.length > 0) {
          amounts.slice(0, 5).forEach((amount, index) => {
            extractedItems.push({
              id: index + 1,
              name: `Item ${index + 1}`,
              quantity: 1,
              price: amount,
              amount: amount
            });
          });
        } else {
          extractedItems.push({ id: 1, name: '', quantity: 1, price: 0, amount: 0 });
        }
        
        // Update form with extracted data
        setInvoice({
          type: invoiceType as 'SENT' | 'RECEIVED',
          senderName: possibleSenderName,
          senderAddress: '',
          receiverName: possibleReceiverName,
          receiverAddress: '',
          date: extractedDate || new Date().toISOString().substring(0, 10),
          items: extractedItems,
          paymentLink: '',
          paymentDeadline: ''
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsScanning(false);
      // Switch to manual tab after processing is complete
      setActiveTab('manual');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      <Sidebar onSignOut={signOut} userName={user?.email?.split('@')[0] || 'User'} />
      
      <div className="flex-1 lg:ml-64 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <TopBar 
            userName={user?.email?.split('@')[0] || 'User'} 
            userEmail={user?.email || 'user@example.com'} 
            onSignOut={signOut} 
          />
          
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePreview}
                  className={`inline-flex items-center px-6 py-2 border ${
                    showPreview 
                      ? 'bg-blue-50 border-blue-300 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700'
                  } rounded-md text-sm font-medium hover:bg-gray-50`}
                >
                  <Eye size={16} className="mr-2" />
                  Preview
                </button>
                <span className="text-sm text-gray-500">This feature is under development</span>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row">
              {/* Form Panel - adjust width based on preview visibility */}
              <div className={`p-6 ${showPreview ? 'lg:w-1/2 border-r border-gray-200' : 'w-full'}`}>
                {/* Tabs for choosing entry method */}
                <div className="border-b border-gray-200 mb-6">
                  <div className="flex -mb-px">
                    <button
                      className={`mr-4 py-2 px-4 border-b-2 font-medium text-sm ${
                        activeTab === 'manual'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('manual')}
                    >
                      Manual Entry
                    </button>
                    <button
                      className={`mr-4 py-2 px-4 border-b-2 font-medium text-sm ${
                        activeTab === 'upload'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('upload')}
                    >
                      Upload Invoice
                    </button>
                  </div>
                </div>
                
                {activeTab === 'upload' ? (
                  <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Upload an invoice</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Our system will attempt to extract data from your invoice
                      </p>
                      
                      <div className="mt-6">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="invoice-upload"
                        />
                        <label
                          htmlFor="invoice-upload"
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Select File
                        </label>
                      </div>
                      
                      {isScanning && (
                        <div className="mt-4">
                          <div className="flex items-center justify-center">
                            <Loader size={16} className="animate-spin mr-2 text-blue-500" />
                            <span className="text-sm text-gray-600">
                              Scanning invoice... {Math.round(scanProgress * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 max-w-md mx-auto">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${Math.round(scanProgress * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {/* Invoice Type */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Type
                      </label>
                      <div className="flex space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name="type"
                            value="SENT"
                            checked={invoice.type === 'SENT'}
                            onChange={() => setInvoice(prev => ({ ...prev, type: 'SENT' }))}
                            className="form-radio h-4 w-4 text-blue-600"
                          />
                          <span className="ml-2 flex items-center">
                            <ArrowUpRight size={16} className="text-green-500 mr-1" />
                            Sent
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name="type"
                            value="RECEIVED"
                            checked={invoice.type === 'RECEIVED'}
                            onChange={() => setInvoice(prev => ({ ...prev, type: 'RECEIVED' }))}
                            className="form-radio h-4 w-4 text-blue-600"
                          />
                          <span className="ml-2 flex items-center">
                            <ArrowDownLeft size={16} className="text-blue-500 mr-1" />
                            Received
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Two-column layout for sender and receiver */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Sender Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              name="senderName"
                              value={invoice.senderName}
                              onChange={handleChange}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Address
                            </label>
                            <textarea
                              name="senderAddress"
                              value={invoice.senderAddress}
                              onChange={handleChange}
                              rows={3}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Receiver Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              name="receiverName"
                              value={invoice.receiverName}
                              onChange={handleChange}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Address
                            </label>
                            <textarea
                              name="receiverAddress"
                              value={invoice.receiverAddress}
                              onChange={handleChange}
                              rows={3}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Date & Invoice Details */}
                    <div className="mb-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Calendar size={16} className="inline mr-1" />
                            Invoice Date
                          </label>
                          <input
                            type="date"
                            name="date"
                            value={invoice.date}
                            onChange={handleChange}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Clock size={16} className="inline mr-1" />
                            Payment Deadline
                          </label>
                          <input
                            type="date"
                            name="paymentDeadline"
                            value={invoice.paymentDeadline}
                            onChange={handleChange}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <LinkIcon size={16} className="inline mr-1" />
                            Payment Link
                          </label>
                          <input
                            type="url"
                            name="paymentLink"
                            value={invoice.paymentLink}
                            onChange={handleChange}
                            placeholder="https://"
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Invoice Items */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
                        <button
                          type="button"
                          onClick={addItem}
                          disabled={invoice.items.length >= 5}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <Plus size={14} className="mr-1" />
                          Add Item
                        </button>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Item
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {invoice.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-6 py-4 text-sm">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                    placeholder="Item description"
                                  />
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(
                                      item.id, 
                                      'quantity', 
                                      parseInt(e.target.value) || 0
                                    )}
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-24 sm:text-sm border-gray-300 rounded-md"
                                  />
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-gray-500 sm:text-sm">£</span>
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.price}
                                      onChange={(e) => handleItemChange(
                                        item.id, 
                                        'price', 
                                        parseFloat(e.target.value) || 0
                                      )}
                                      className="focus:ring-blue-500 focus:border-blue-500 block w-24 pl-7 sm:text-sm border-gray-300 rounded-md"
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <span className="text-gray-500 sm:text-sm">£</span>
                                    </div>
                                    <input
                                      type="number"
                                      readOnly
                                      value={item.amount.toFixed(2)}
                                      className="bg-gray-50 block w-24 pl-7 sm:text-sm border-gray-300 rounded-md"
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    disabled={invoice.items.length <= 1}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            
                            {/* Total Row */}
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="px-6 py-4 text-sm text-right font-medium">
                                Total:
                              </td>
                              <td className="px-6 py-4 text-sm font-bold">
                                {formatCurrency(calculateTotal())}
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Submit Button */}
                    <div className="mt-8 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Send size={16} className="mr-2" />
                        Save Invoice
                      </button>
                    </div>
                  </form>
                )}
              </div>
              
              {/* Preview Panel */}
              {showPreview && (
                <div className="lg:w-1/2 p-6 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Preview</h2>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Printer size={18} />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Invoice Preview */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 overflow-auto max-h-[800px]">
                    <div className="mb-8 text-center">
                      <h2 className="text-xl font-bold text-gray-800">
                        {invoice.type === 'SENT' ? 'Sent Invoice' : 'Received Invoice'}
                      </h2>
                    </div>
                    
                    <div className="flex justify-between mb-8">
                      <div>
                        <div className="font-semibold text-gray-700">From:</div>
                        <div className="text-gray-800 font-medium">{invoice.senderName || 'Your Company'}</div>
                        <div className="text-gray-600 whitespace-pre-line">{invoice.senderAddress || 'Your Address'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-700">To:</div>
                        <div className="text-gray-800 font-medium">{invoice.receiverName || 'Client Name'}</div>
                        <div className="text-gray-600 whitespace-pre-line">{invoice.receiverAddress || 'Client Address'}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-8">
                      <div>
                        <div className="font-semibold text-gray-700">Invoice Date:</div>
                        <div>{invoice.date || 'Not specified'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-700">Due Date:</div>
                        <div>{invoice.paymentDeadline || 'Not specified'}</div>
                      </div>
                    </div>
                    
                    <table className="min-w-full divide-y divide-gray-200 mb-8">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                          <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoice.items.map((item) => (
                          item.name && (
                            <tr key={item.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.price)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                            </tr>
                          )
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total:</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                            {formatCurrency(calculateTotal())}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    
                    {invoice.paymentLink && (
                      <div className="mb-4">
                        <div className="font-semibold text-gray-700 mb-1">Payment Link:</div>
                        <a href={invoice.paymentLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {invoice.paymentLink}
                        </a>
                      </div>
                    )}
                    
                    <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
                      Thank you for your business!
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
