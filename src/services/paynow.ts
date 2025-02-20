/**
 * PayNow Gateway Service
 * Core integration with PayNow payment infrastructure
 * Handles: 
 * - Payment request creation
 * - Currency conversion
 * - Response handling
 * - Status polling
 */
import { Paynow } from 'paynow';
import { CartItem } from '@/types/types';

/**
 * PayNow Service handles integration with PayNow payment gateway
 * Features:
 * - Web payments (credit cards/bank transfers)
 * - Mobile money payments (EcoCash, OneMoney)
 * - Payment status polling
 */
export class PaynowService {
  private paynow: any;
  private static instance: PaynowService;

  constructor() {
    // Validate critical environment configuration
    if (!process.env.NEXT_PUBLIC_PAYNOW_INTEGRATION_ID || 
        !process.env.NEXT_PUBLIC_PAYNOW_INTEGRATION_KEY) {
      throw new Error('PayNow credentials not found in environment variables');
    }

    // Initialize PayNow SDK with credentials
    this.paynow = new Paynow(
      process.env.NEXT_PUBLIC_PAYNOW_INTEGRATION_ID,
      process.env.NEXT_PUBLIC_PAYNOW_INTEGRATION_KEY
    );
    
    // Configure callback URLs for payment lifecycle
    this.paynow.resultUrl = "http://localhost:3000/api/payment/update";
    this.paynow.returnUrl = "http://localhost:3000/payment/success";
  }

  /**
   * Generates unique transaction reference
   * Format: INV-{random alphanumeric string}
   * Ensures no collision between transactions
   */
  private generateReference(): string {
    return `INV-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initiate web-based payment (credit cards/bank transfers)
   * @param items - Array of cart items with pricing
   * @param email - Customer email for receipt
   * @returns Payment gateway response with redirect URL
   */
  async initiateWebPayment(items: CartItem[], email: string) {
    try {
      const reference = this.generateReference();
      
      // Create base payment object
      const payment = this.paynow.createPayment(
        reference, 
        process.env.NEXT_PUBLIC_PAYNOW_MERCHANT_EMAIL // Merchant account email
      );

      // Add items with currency conversion (USD to cents)
      items.forEach(item => {
        const amount = Math.round(item.price * 100) * item.quantity;
        payment.add(item.name, amount);
      });

      // Submit payment to PayNow
      const response = await this.paynow.send(payment);
      
      // Validate gateway response
      if (!response?.success) {
        throw new Error(response?.error || 'Payment initiation failed');
      }

      return {
        success: true,
        redirectUrl: response.redirectUrl,
        pollUrl: response.pollUrl,
        reference
      };
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  /**
   * Initiate mobile money payment
   * @param items - Array of cart items
   * @param email - Customer receipt email
   * @param phone - Customer mobile number (format: +263771234567)
   * @param method - Payment provider (ecocash/onemoney)
   * @returns Payment instructions and status URL
   */
  async initiateMobilePayment(
    items: CartItem[], 
    email: string,
    phone: string,
    method: 'ecocash' | 'onemoney'
  ) {
    try {
      const payment = this.paynow.createPayment(
        `Invoice-${Date.now()}`, 
        email
      );

      items.forEach(item => {
        payment.add(item.name, item.price * item.quantity);
      });

      const response = await this.paynow.sendMobile(payment, phone, method);

      if (response.success) {
        return {
          success: true,
          instructions: response.instructions,
          pollUrl: response.pollUrl,
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Mobile payment failed:', error);
      throw error;
    }
  }

  /**
   * Poll payment status
   * @param pollUrl - Status URL from initial response
   * @returns Boolean indicating payment success
   */
  async checkPaymentStatus(pollUrl: string) {
    try {
      const status = await this.paynow.pollTransaction(pollUrl);
      return status.paid();
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }
} 