'use client';

import { useState, useEffect, Suspense } from 'react';
import { signInWithEmail, supabase } from '../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiLogIn, FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import Header from '@/components/ui/header';
import Footer from '@/components/ui/footer';

// Component to handle useSearchParams with Suspense
function RedirectHandler({ onRedirect }: { onRedirect: (redirectTo: string) => void }) {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/dashboard';
  useEffect(() => {
    onRedirect(redirectTo);
  }, [redirectTo, onRedirect]);
  return null;
}

export const dynamic = 'force-dynamic'; // Force dynamic rendering to avoid prerendering issues

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/dashboard');
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('User already authenticated, redirecting to:', redirectTo);
        router.push(redirectTo);
      }
    };
    checkUser();
  }, [router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting sign in...');
      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        console.error('Sign in error:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      console.log('Sign in successful:', data);

      if (data?.session) {
        console.log('Session created, redirecting to:', redirectTo);
        // Small delay to ensure session is set
        setTimeout(() => {
          router.refresh();
          router.push(redirectTo);
        }, 100);
      } else {
        setError('Authentication failed. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Suspense fallback={<div>Loading...</div>}>
        <RedirectHandler onRedirect={setRedirectTo} />
      </Suspense>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 mt-10">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center space-x-3">
              <FiLogIn className="text-2xl" />
              <h1 className="text-2xl font-bold">Welcome Back</h1>
            </div>
            <p className="text-blue-100 mt-1">Sign in to access your research dashboard</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm"></div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign In <FiArrowRight className="ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-800 transition-colors">
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}