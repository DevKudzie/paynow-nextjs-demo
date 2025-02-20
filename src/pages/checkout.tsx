import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCartStore } from '@/utils/cart';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PaynowService } from '@/services/paynow';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export default function Checkout() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'mobile'>('web');

  useEffect(() => {
    if (items.length === 0) {
      router.push('/');
    }
  }, [items, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    // Clear error when user starts typing
    if (errors[id as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [id]: undefined
      }));
    }
  };

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
      console.log('Payment initiation response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Payment initiation failed');
      }

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
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full bg-dark-700 border ${
                    errors.email ? 'border-red-500' : 'border-dark-600'
                  } rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm text-dark-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full bg-dark-700 border ${
                    errors.phone ? 'border-red-500' : 'border-dark-600'
                  } rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>
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
