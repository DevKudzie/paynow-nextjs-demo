/**
 * Payment Failed Page
 * Displays error message for failed transactions
 * Features:
 * - Error indicator
 * - Retry button
 * - Home navigation
 * - Dynamic error messages (TODO)
 */
import Link from 'next/link';
import { XCircleIcon, HomeIcon } from '@heroicons/react/24/outline';

export default function PaymentFailed() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
        <h1 className="mt-4 text-2xl font-bold text-white">Payment Failed</h1>
        <p className="mt-2 text-dark-300">
          Something went wrong with your payment. Please try again.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link 
            href="/checkout"
            className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400"
          >
            Try Again
          </Link>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400"
          >
            <HomeIcon className="h-5 w-5" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
} 