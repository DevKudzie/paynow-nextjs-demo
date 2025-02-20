import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCartStore } from '@/utils/cart';
import { ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { PaynowService } from '@/services/paynow';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Checkout Page
 * Handles the final payment details collection and payment initiation
 * Features:
 * - Payment method selection (web/mobile)
 * - Form validation
 * - Test mode indicators
 * - Payment gateway redirection
 */
export default function Checkout() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    name: '',
    email: process.env.NEXT_PUBLIC_PAYNOW_MERCHANT_EMAIL || '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'mobile'>('web');

  // Get test numbers from environment
  const testNumbers = {
    ecocash: process.env.NEXT_PUBLIC_PAYNOW_TEST_ECOCASH_PHONE || '+263771234567',
    onemoney: process.env.NEXT_PUBLIC_PAYNOW_TEST_ONEMONEY_PHONE || '+263731234567'
  };

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/');
    }
  }, [items, router]);

  /**
   * Validates form inputs based on payment method
   * @returns boolean - true if form is valid
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name is always required
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Phone required for mobile payments
    if (paymentMethod === 'mobile' && !formData.phone.trim()) {
      newErrors.phone = 'Phone number required for mobile payments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles input changes and clears related errors
   * @param e - React change event from input elements
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    
    if (errors[id as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [id]: undefined }));
    }
  };

  /**
   * Handles payment form submission
   * @param e - Form submission event
   */
  const handlePayNowCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsProcessing(true);
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          email: formData.email,
          paymentMethod,
          phone: formData.phone
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Payment failed');
      
      if (data.success) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      router.push({
        pathname: '/payment/failed',
        query: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-dark-400 hover:text-white mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>

        <form onSubmit={handlePayNowCheckout} className="bg-dark-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Checkout</h1>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Payment Method</h2>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('web')}
                className={`px-4 py-2 rounded-md ${
                  paymentMethod === 'web' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                Credit/Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile')}
                className={`px-4 py-2 rounded-md ${
                  paymentMethod === 'mobile' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                Mobile Money
              </button>
            </div>
          </div>

          {/* Test Mode Banner */}
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-md p-4 mb-6">
            <div className="flex items-center gap-2 text-yellow-500">
              <InformationCircleIcon className="h-5 w-5" />
              <span className="font-medium">Test Mode Active</span>
            </div>
            <p className="mt-2 text-yellow-400 text-sm">
              Using test credentials - all transactions are simulated
            </p>
          </div>

          {/* Order Summary */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-white">Order Summary</h2>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-dark-300"
              >
                <span>
                  {item.name} x {item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-dark-700 pt-4 mt-4">
              <div className="flex justify-between items-center text-white font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details Form */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-white">Payment Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm text-dark-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full bg-dark-700 border ${
                    errors.name ? 'border-red-500' : 'border-dark-600'
                  } rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-dark-300 mb-1">
                  Email (Test Mode)
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  readOnly
                  className="w-full bg-dark-700 border border-dark-600 rounded-md px-4 py-2 text-dark-300 cursor-not-allowed"
                />
                <p className="mt-2 text-sm text-dark-400">
                  Using merchant test email: {formData.email}
                </p>
              </div>

              {paymentMethod === 'mobile' && (
                <div>
                  <label htmlFor="phone" className="block text-sm text-dark-300 mb-1">
                    Mobile Number (+263...)
                    <span className="ml-2 text-blue-400 text-xs" title="Test mode numbers">
                      (Test: {testNumbers.ecocash} or {testNumbers.onemoney})
                    </span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full bg-dark-700 border ${
                      errors.phone ? 'border-red-500' : 'border-dark-600'
                    } rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder={`e.g. ${testNumbers.ecocash}`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full ${
              isProcessing ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-semibold py-3 px-4 rounded-md transition-colors`}
          >
            {isProcessing ? 'Processing...' : `Pay Now ($${total.toFixed(2)})`}
          </button>
        </form>
      </div>
    </div>
  );
}
