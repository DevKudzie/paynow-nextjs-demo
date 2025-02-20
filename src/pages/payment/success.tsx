/**
 * Payment Success Page
 * Displays confirmation of successful payment
 * Features:
 * - Success indicator
 * - Continue shopping button
 * - Auto-redirect (TODO)
 */
import Link from 'next/link';
import { CheckCircleIcon, HomeIcon } from '@heroicons/react/24/outline';

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="mt-4 text-2xl font-bold text-white">Payment Successful!</h1>
        <p className="mt-2 text-dark-300">
          Thank you for your purchase. You will receive an email confirmation shortly.
        </p>
        <Link 
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-blue-500 hover:text-blue-400"
        >
          <HomeIcon className="h-5 w-5" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
} 