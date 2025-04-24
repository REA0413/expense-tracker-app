'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Create a wrapper component that uses the search params
function VerifyEmailContent() {
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token and type from URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token || !type) {
          setError('Invalid verification link');
          setVerifying(false);
          return;
        }
        
        // Verify the token with Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type === 'signup' ? 'signup' : 'recovery',
        });
        
        if (error) {
          setError(error.message);
        } else {
          setSuccess(true);
        }
      } catch (err) {
        setError('An error occurred during verification');
        console.error(err);
      } finally {
        setVerifying(false);
      }
    };
    
    verifyEmail();
  }, [searchParams]);
  
  // Redirect to login after successful verification
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success, router]);
  
  return (
    <div className="bg-gradient-to-b from-midtrans-blue to-blue-900 flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Email Verification</h1>
        
        {verifying && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p>Verifying your email...</p>
          </div>
        )}
        
        {error && (
          <div className="p-4 rounded bg-red-100 text-red-700">
            <p>{error}</p>
            <p className="mt-2">
              Please try <a href="/auth/signup" className="text-blue-600 hover:underline">signing up</a> again.
            </p>
          </div>
        )}
        
        {success && (
          <div className="p-4 rounded bg-green-100 text-green-700">
            <p>Your email has been verified successfully!</p>
            <p className="mt-2">You will be redirected to the login page in a few seconds...</p>
            <p className="mt-2">
              Or click <a href="/auth/login" className="text-blue-600 hover:underline">here</a> to login now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component that uses Suspense
export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="bg-gradient-to-b from-midtrans-blue to-blue-900 flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center">Email Verification</h1>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p>Loading verification...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
} 