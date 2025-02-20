/**
 * Checkout Service
 * Orchestrates the checkout process between UI and payment gateway
 * Handles:
 * - Order validation
 * - Data transformation
 * - Error handling
 */
import { PaynowService } from './paynow';

// Interface definitions for type safety
export interface PaymentDetails {
  name: string;
  email: string;
  phone: string;
}

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderData {
  amount: number;
  items: OrderItem[];
  reference: string;
  customerDetails: PaymentDetails;
}

interface CartItem extends OrderItem {
  description: string;
  image: string;
  stock: number;
}

export class CheckoutService {
  /**
   * Validate order data before processing
   * Ensures all required fields meet business rules
   */
  private static validateOrderData(orderData: OrderData): boolean {
    if (orderData.amount <= 0) return false;
    if (!orderData.items.length) return false;
    if (!orderData.customerDetails.email || !orderData.customerDetails.name) return false;
    return true;
  }

  private static toCartItems(items: OrderItem[]): CartItem[] {
    return items.map(item => ({
      ...item,
      description: '',  // Default values for required CartItem properties
      image: '',
      stock: 0
    }));
  }

  /**
   * Initiate payment process
   * @param items - Cart items
   * @param customerDetails - Customer information
   * @param paymentMethod - Selected payment method
   * @returns Payment gateway response
   */
  public static async initiatePayment(
    items: OrderItem[],
    customerDetails: PaymentDetails,
    paymentMethod: 'web' | 'mobile' = 'web'
  ) {
    try {
      // Calculate total amount
      const amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      // Validate customer details
      if (!customerDetails.email || !customerDetails.name) {
        throw new Error('Invalid customer details');
      }

      // Validate order contents
      if (amount <= 0 || items.length === 0) {
        throw new Error('Invalid order data');
      }

      // Forward to payment API
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerDetails,
          paymentMethod
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Payment initiation failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment initiation failed'
      };
    }
  }
} 