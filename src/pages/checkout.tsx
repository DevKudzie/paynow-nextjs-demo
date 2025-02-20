import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCartStore } from '@/utils/cart';
import { ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { PaynowService, PAYNOW_TEST_NUMBERS } from '@/services/paynow';
import toast from 'react-hot-toast';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

// Define payment method types
type PaymentMethod = 'web' | 'ecocash' | 'onemoney';

interface PaymentStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  countdown?: number;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('web');
  const [formData, setFormData] = useState({
    name: '',
    email: process.env.NEXT_PUBLIC_PAYNOW_MERCHANT_EMAIL || '',
    phone: ''
  });
  const [mobilePaymentStatus, setMobilePaymentStatus] = useState<PaymentStatus>({
    status: 'idle',
    message: ''
  });

  const [pollCount, setPollCount] = useState(0);
  const MAX_POLLS = 12; // 1 minute (12 * 5 seconds)

  // Get test numbers from constants
  const testNumbers = {
    ecocash: PAYNOW_TEST_NUMBERS.SUCCESS,    // Default to success scenario
    onemoney: PAYNOW_TEST_NUMBERS.SUCCESS    // Default to success scenario
  };

  // Add test scenario selection
  const [testScenario, setTestScenario] = useState<keyof typeof PAYNOW_TEST_NUMBERS>('SUCCESS');

  const [pollData, setPollData] = useState<{
    url: string;
    phone?: string;
    startTime: number;
  } | null>(null);

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
    if (paymentMethod !== 'web' && !formData.phone.trim()) {
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
    
    try {
      setIsProcessing(true);

      if (!validateForm()) {
        toast.error('Please fill in all required fields');
        return;
      }

      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          email: formData.email,
          phone: formData.phone,
          paymentMethod,
          testScenario
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment failed');
      }

      if (paymentMethod === 'web' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setMobilePaymentStatus({
          status: 'pending',
          message: data.instructions || 'Please check your phone to authorize payment'
        });
        
        // Initialize poll data
        setPollData({
          url: data.pollUrl,
          phone: formData.phone,
          startTime: Date.now()
        });
        
        // Start polling with phone number
        startPolling(data.pollUrl, formData.phone);
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed');
      setMobilePaymentStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Payment failed'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startPolling = async (pollUrl: string, phone?: string) => {
    try {
      // Use existing poll data if available
      const currentPollData = pollData || {
        url: pollUrl,
        phone,
        startTime: Date.now()
      };

      const response = await fetch('/api/payment/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pollUrl: currentPollData.url,
          phone: currentPollData.phone,
          startTime: currentPollData.startTime
        })
      });

      const data = await response.json();
      console.log('Poll response:', data);

      // Calculate elapsed time
      const elapsedTime = Math.floor((Date.now() - currentPollData.startTime) / 1000);
      const remainingTime = 60 - elapsedTime;

      if (data.status === 'pending') {
        setMobilePaymentStatus({
          status: 'pending',
          message: 'Processing payment...',
          countdown: remainingTime > 0 ? remainingTime : 0
        });
        
        if (remainingTime > 0) {
          setTimeout(() => startPolling(pollUrl), 5000);
        } else {
          toast.error('Payment timed out');
          setMobilePaymentStatus({
            status: 'error',
            message: 'Payment timed out after 1 minute'
          });
        }
      } else if (data.status === 'paid') {
        toast.success('Payment successful!');
        setMobilePaymentStatus({
          status: 'success',
          message: 'Payment completed successfully'
        });
        setTimeout(() => router.push('/payment/success'), 2000);
      } else {
        toast.error(data.message || 'Payment failed');
        setMobilePaymentStatus({
          status: 'error',
          message: data.message || 'Payment failed'
        });
      }
    } catch (error) {
      toast.error('Failed to check payment status');
      setMobilePaymentStatus({
        status: 'error',
        message: 'Failed to check payment status'
      });
    }
  };

  /**
   * Updates phone number when payment method changes
   */
  useEffect(() => {
    if (paymentMethod === 'ecocash') {
      setFormData(prev => ({ ...prev, phone: testNumbers.ecocash }));
    } else if (paymentMethod === 'onemoney') {
      setFormData(prev => ({ ...prev, phone: testNumbers.onemoney }));
    }
  }, [paymentMethod]);

  // Update phone number when test scenario changes
  useEffect(() => {
    if (paymentMethod !== 'web') {
      setFormData(prev => ({ 
        ...prev, 
        phone: PAYNOW_TEST_NUMBERS[testScenario] 
      }));
    }
  }, [paymentMethod, testScenario]);

  /**
   * Test Mode Information Component
   * Displays information about test mode and available test scenarios
   */
  const TestModeInfo = () => (
    <div className="bg-blue-900/20 border border-blue-800 rounded-md p-4 mb-6">
      <div className="flex items-center gap-2 text-blue-500">
        <InformationCircleIcon className="h-5 w-5" />
        <span className="font-medium">Test Mode Guide</span>
      </div>
      <div className="mt-2 text-sm text-blue-400 space-y-1">
        <p>• Only merchant email can complete test transactions</p>
        <p>• Test scenarios simulate different payment outcomes</p>
        <p>• No actual money is moved during testing</p>
      </div>
    </div>
  );

  /**
   * Test Scenario Selector Component
   * Allows selection of different test scenarios with explanatory text
   */
  const TestScenarioSelector = ({
    scenario,
    onChange
  }: {
    scenario: keyof typeof PAYNOW_TEST_NUMBERS;
    onChange: (scenario: keyof typeof PAYNOW_TEST_NUMBERS) => void;
  }) => (
    <div className="mb-4">
      <label className="block text-sm text-dark-300 mb-2">
        Test Scenario
        <span className="ml-2 text-xs text-blue-400">(Quick Success and Insufficient Balance enabled)</span>
      </label>
      <select
        value={scenario}
        onChange={(e) => onChange(e.target.value as keyof typeof PAYNOW_TEST_NUMBERS)}
        className="w-full bg-dark-700 border border-dark-600 rounded-md px-4 py-2 text-white"
      >
        <option value="SUCCESS">Quick Success (5s)</option>
        <option value="INSUFFICIENT">Insufficient Balance</option>
        <option value="DELAYED" disabled>Delayed Success (30s) - Currently Unhandled</option>
        <option value="CANCELLED" disabled>User Cancelled (30s) - Currently Unhandled</option>
      </select>
      <p className="mt-2 text-sm text-dark-400">
        Using test number: {PAYNOW_TEST_NUMBERS[scenario]}
        <br />
        {scenario === 'SUCCESS' && '✓ Payment will succeed after 5 seconds'}
        {scenario === 'INSUFFICIENT' && '⚠ Will simulate insufficient funds error'}
        {scenario === 'DELAYED' && '⏳ Currently Unhandled - 30-second delay simulation'}
        {scenario === 'CANCELLED' && '✕ Currently Unhandled - User cancellation simulation'}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-dark-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Continue Shopping
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content - Payment Details */}
          <div className="lg:col-span-8">
            <div className="bg-dark-800 rounded-2xl shadow-xl p-8">
              <h1 className="text-2xl font-semibold text-white mb-8">Checkout</h1>

              {/* Test Mode Info - Only in development */}
              {process.env.NODE_ENV === 'development' && <TestModeInfo />}

              {/* Payment Method Selection */}
              <div className="mb-8">
                <h2 className="text-sm font-medium text-dark-300 mb-4">
                  Payment Method
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('web')}
                    className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'web'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-dark-700 text-dark-400 hover:border-dark-600'
                    }`}
                  >
                    Card Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ecocash')}
                    className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'ecocash'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-dark-700 text-dark-400 hover:border-dark-600'
                    }`}
                  >
                    EcoCash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('onemoney')}
                    className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'onemoney'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-dark-700 text-dark-400 hover:border-dark-600'
                    }`}
                  >
                    OneMoney
                  </button>
                </div>
              </div>

              {/* Test Scenario Selector - Only for mobile payments in development */}
              {process.env.NODE_ENV === 'development' && paymentMethod !== 'web' && (
                <TestScenarioSelector 
                  scenario={testScenario}
                  onChange={setTestScenario}
                />
              )}

              {/* Payment Form - Now includes the submit button */}
              <form onSubmit={handlePayNowCheckout} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      readOnly
                      className="w-full bg-dark-700/50 border border-dark-600 rounded-xl px-4 py-3 text-white"
                    />
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-dark-300 mb-2">
                      Phone Number
                      {paymentMethod !== 'web' && (
                        <span className="ml-2 text-xs text-blue-400">
                          (Test Mode)
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full bg-dark-700/50 border rounded-xl px-4 py-3 text-white ${
                        errors.phone ? 'border-red-500' : 'border-dark-600'
                      }`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Full Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-dark-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full bg-dark-700/50 border rounded-xl px-4 py-3 text-white ${
                      errors.name ? 'border-red-500' : 'border-dark-600'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* Order Summary for Mobile */}
                <div className="lg:hidden">
                  <div className="border-t border-dark-700 pt-4 space-y-4">
                    <div className="flex justify-between text-dark-300">
                      <span>Subtotal</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button - Now with adjusted*/}
                <div className="flex justify-left">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`px-12 py-4 rounded-xl font-semibold transition-all ${
                      isProcessing
                        ? 'bg-blue-600 text-dark-300 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-4 hidden lg:block">
            <div className="bg-dark-800 rounded-2xl shadow-xl p-8 sticky top-8">
              <h2 className="text-lg font-semibold text-white mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start space-x-4">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{item.name}</h3>
                      <p className="text-dark-400">Qty: {item.quantity}</p>
                      <p className="text-dark-300">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dark-700 pt-4 space-y-4">
                <div className="flex justify-between text-dark-300">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Mobile Payment Status */}
              {paymentMethod !== 'web' && mobilePaymentStatus.status !== 'idle' && (
                <div className={`mt-4 p-4 rounded-xl border ${
                  mobilePaymentStatus.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-200' :
                  mobilePaymentStatus.status === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-200' :
                  'bg-red-500/10 border-red-500/50 text-red-200'
                }`}>
                  <p className="text-sm">
                    {mobilePaymentStatus.message}
                    {mobilePaymentStatus.countdown && (
                      <span className="ml-2">
                        (Timeout in {mobilePaymentStatus.countdown}s)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
