'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, FileText, Loader } from 'lucide-react';
import Tesseract from 'tesseract.js';

type ReceiptScannerProps = {
  onScanComplete: (data: {
    amount?: string;
    date?: string;
    merchant?: string;
    text: string;
  }) => void;
};

export default function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Use Tesseract.js to recognize text in the image
      const result = await Tesseract.recognize(
        file,
        'eng', // English language
        { 
          logger: m => {
            if (m.status === 'recognizing text') {
              setScanProgress(m.progress);
            }
          } 
        }
      );
      
      const text = result.data.text;
      
      // Try to extract information from the receipt
      const amountMatch = text.match(/\$?(\d+\.\d{2})/); // Look for dollar amounts
      const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/); // Look for dates
      
      // Extract merchant name (first line often has the merchant name)
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const merchantName = lines.length > 0 ? lines[0].trim() : '';
      
      // Format date if found
      let formattedDate = '';
      if (dateMatch) {
        const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        const month = dateMatch[1].padStart(2, '0');
        const day = dateMatch[2].padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }
      
      onScanComplete({
        amount: amountMatch ? amountMatch[1] : undefined,
        date: formattedDate || undefined,
        merchant: merchantName || undefined,
        text
      });
    } catch (error) {
      console.error('Error scanning receipt:', error);
    } finally {
      setIsScanning(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="mb-3 flex items-center">
        <FileText className="text-blue-500 mr-2" size={20} />
        <h3 className="text-lg font-medium">Receipt Scanner</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Upload a receipt image to automatically extract transaction details.
      </p>
      
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        id="receipt-upload"
      />
      
      <div className="flex flex-col sm:flex-row gap-3">
        <label
          htmlFor="receipt-upload"
          className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
        >
          <Upload size={16} className="mr-2" />
          Upload Receipt
        </label>
        
        <button
          onClick={() => {
            // In a real app, this would activate the camera
            alert('Camera functionality would be implemented here');
          }}
          className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Camera size={16} className="mr-2" />
          Take Photo
        </button>
      </div>
      
      {isScanning && (
        <div className="mt-4">
          <div className="flex items-center">
            <Loader size={16} className="animate-spin mr-2 text-blue-500" />
            <span className="text-sm text-gray-600">Scanning receipt... {Math.round(scanProgress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${Math.round(scanProgress * 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
} 