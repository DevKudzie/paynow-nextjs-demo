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
 * Test Mode Configuration
 * These numbers simulate different payment scenarios in test mode
 * Documentation: https://developers.paynow.co.zw/docs/test_mode.html
 */
export const PAYNOW_TEST_NUMBERS = {
  SUCCESS: '0771111111',     // Payment succeeds after 5 seconds
  DELAYED: '0772222222',     // Payment succeeds after 30 seconds
  CANCELLED: '0773333333',   // Payment fails after 30 seconds
  INSUFFICIENT: '0774444444' // Immediate failure - insufficient balance
} as const;

/**
 * Mobile Money Express Checkout Response
 * Represents the possible states of a mobile payment
 */
export interface MobilePaymentResponse {
  success: boolean;
  error?: string;
  pollUrl?: string;
  instructions?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  redirectUrl?: string;
  reference?: string;
}

interface PaymentResponse {
  success: boolean;
  error?: string;
  redirectUrl?: string;
  pollUrl?: string;
  reference: string;
  instructions?: string;
  status?: 'pending' | 'paid' | 'cancelled' | 'failed';
}

/**
 * PayNow Service
 * Handles integration with PayNow payment gateway
 * Features:
 * - Web payments (credit cards/bank transfers)
 * - Mobile money payments (EcoCash, OneMoney)
 * - Test mode simulation
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
    
    // Set return URLs
    this.paynow.resultUrl = process.env.PAYNOW_RESULT_URL || '/api/payment/update';
    this.paynow.returnUrl = process.env.PAYNOW_RETURN_URL || '/payment/success';
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
  async initiateWebPayment(items: CartItem[], email: string): Promise<PaymentResponse> {
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        reference: this.generateReference()
      };
    }
  }

  /**
   * Initiate mobile money payment
   * Handles express checkout for EcoCash and OneMoney
   */
  async initiateMobilePayment(
    items: CartItem[], 
    email: string,
    phone: string,
    method: 'ecocash' | 'onemoney'
  ): Promise<MobilePaymentResponse> {
    try {
      const reference = this.generateReference();
      const payment = this.paynow.createPayment(reference, email);

      items.forEach(item => {
        payment.add(item.name, item.price * item.quantity);
      });

      const response = await this.paynow.sendMobile(payment, phone, method);

      if (!response?.success) {
        // Pass through the specific error from PayNow
        throw new Error(response?.error || 'Payment initiation failed');
      }

      return {
        success: true,
        instructions: response.instructions,
        pollUrl: response.pollUrl,
        status: 'pending',
        reference
      };
    } catch (error) {
      console.error('Mobile payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      };
    }
  }

  /**
   * Poll payment status
   * @param pollUrl - Status URL from initial response
   * @returns Payment status update
   */
  async checkPaymentStatus(
    pollUrl: string, 
    phone?: string, 
    startTime?: number
  ): Promise<{
    paid: boolean;
    status: 'pending' | 'paid' | 'cancelled' | 'failed';
    error?: string;
  }> {
    try {
      const status = await this.paynow.pollTransaction(pollUrl);
      const elapsedTime = startTime ? Date.now() - startTime : 0;

      // Log the response for debugging
      console.log('PayNow status response:', status);

      // In test mode, simulate different scenarios based on phone numbers
      if (process.env.NODE_ENV === 'development' && phone) {
        switch(phone) {
          case PAYNOW_TEST_NUMBERS.DELAYED:
            if (elapsedTime < 30000) {
              console.log('Delayed payment still pending:', elapsedTime);
              return { 
                paid: false, 
                status: 'pending',
                error: 'Payment processing...'
              };
            }
            console.log('Delayed payment complete');
            return { 
              paid: true, 
              status: 'paid' 
            };

          case PAYNOW_TEST_NUMBERS.CANCELLED:
            if (elapsedTime < 30000) {
              return { 
                paid: false, 
                status: 'pending',
                error: 'Waiting for customer response...'
              };
            }
            return { 
              paid: false, 
              status: 'cancelled',
              error: 'Payment was cancelled by the user'
            };

          case PAYNOW_TEST_NUMBERS.SUCCESS:
            if (elapsedTime < 5000) {
              return { 
                paid: false, 
                status: 'pending',
                error: 'Processing payment...'
              };
            }
            return { 
              paid: true, 
              status: 'paid' 
            };

          case PAYNOW_TEST_NUMBERS.INSUFFICIENT:
            return {
              paid: false,
              status: 'failed',
              error: 'Insufficient balance in your account'
            };
        }
      }

      // For production or non-test numbers, use actual PayNow response
      const paymentStatus = status.status?.toLowerCase() || 'pending';
      
      return {
        paid: paymentStatus === 'paid' || paymentStatus === 'complete' || paymentStatus === 'confirmed',
        status: paymentStatus as 'pending' | 'paid' | 'cancelled' | 'failed',
        error: status.error
      };

    } catch (error) {
      console.error('Status check failed:', error);
      return {
        paid: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to check payment status'
      };
    }
  }
} 