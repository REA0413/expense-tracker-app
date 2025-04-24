'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-midtrans-blue to-blue-900 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome to <span className="text-blue-300">Expense Tracker App</span>
        </h1>
        <p className="text-xl text-blue-100 max-w-xl mx-auto">
          Hi, welcome to my fun project of designing an expense tracker app.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
        <button
          onClick={() => router.push('/auth/login')}
          className="bg-white text-midtrans-blue font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-100 transition duration-200 flex-1"
        >
          Login
        </button>
        <button
          onClick={() => router.push('/auth/signup')}
          className="bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-600 transition duration-200 flex-1"
        >
          Sign Up
        </button>
      </div>
      
      <div className="mt-20 text-sm text-blue-200 opacity-80">
        &copy; {new Date().getFullYear()} ExpenseTracker • All rights reserved
      </div>
    </div>
  );
}
