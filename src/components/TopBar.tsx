'use client';

import { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';

type TopBarProps = {
  userName: string;
  userEmail: string;
  onSignOut: () => void;
};

export default function TopBar({ userName, userEmail, onSignOut }: TopBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, {userName}</p>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search..." 
            className="py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-midtrans-accent focus:border-transparent w-48 lg:w-64"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full"></span>
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <div className="w-8 h-8 bg-midtrans-accent rounded-full flex items-center justify-center text-white font-semibold mr-2">
              {userName.charAt(0)}
            </div>
            <ChevronDown size={16} />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg py-2 z-10 border border-gray-200">
              <div className="px-4 py-2 border-b border-gray-200">
                <p className="font-semibold">{userName}</p>
                <p className="text-sm text-gray-500">{userEmail}</p>
              </div>
              <button 
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={onSignOut}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 