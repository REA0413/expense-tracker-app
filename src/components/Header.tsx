'use client';

import { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import Image from 'next/image';

type HeaderProps = {
  userName: string;
  userEmail: string;
  onSignOut: () => void;
};

export default function Header({ userName, userEmail, onSignOut }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
      <div className="flex-1">
        <div className="relative max-w-md">
          <input 
            type="text" 
            placeholder="Search transactions..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>
      
      <div className="flex items-center">
        <button className="p-2 text-gray-500 hover:text-gray-700 relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full"></span>
        </button>
        
        <div className="relative ml-4">
          <button 
            className="flex items-center text-gray-700 hover:text-gray-900"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-2">
              {userName.charAt(0)}
            </div>
            <span className="mr-1 hidden md:inline">{userName}</span>
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
                onClick={() => {
                  setShowDropdown(false);
                  onSignOut();
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 