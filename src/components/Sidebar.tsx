'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  Home, 
  FileText, 
  CreditCard, 
  PieChart, 
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

type SidebarProps = {
  onSignOut: () => void;
  userName: string;
};

export default function Sidebar({ onSignOut, userName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
    { name: 'Transactions', path: '/transactions', icon: <CreditCard size={20} /> },
    { name: 'Invoices', path: '/invoices', icon: <FileText size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <PieChart size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 z-20 m-4">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-20 bg-midtrans-blue text-white transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-midtrans-highlight">
          <div className="flex items-center justify-between w-full">
            {!collapsed && (
              <div className="text-xl font-bold text-white">ExpenseTracker</div>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-full hover:bg-midtrans-highlight lg:block hidden"
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link 
                  href={item.path} 
                  className={`flex items-center py-3 px-4 ${
                    pathname === item.path ? 'bg-midtrans-highlight' : 'hover:bg-midtrans-highlight'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-midtrans-highlight">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-midtrans-highlight flex items-center justify-center">
              {userName.charAt(0)}
            </div>
            {!collapsed && (
              <div className="ml-3">
                <div className="text-sm font-medium">{userName}</div>
                <button 
                  onClick={onSignOut}
                  className="text-xs text-gray-300 hover:text-white flex items-center mt-1"
                >
                  <LogOut size={12} className="mr-1" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 