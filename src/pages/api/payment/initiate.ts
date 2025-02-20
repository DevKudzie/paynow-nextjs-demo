/**
 * API Endpoint: Payment Initiation
 * Handles creation of new payments through PayNow gateway
 * Supports both web payments (credit cards) and mobile money payments
 * 
 * Flow:
 * 1. Validate request method
 * 2. Log payment attempt
 * 3. Route to appropriate payment method handler
 * 4. Return payment instructions or error
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { PaynowService } from '@/services/paynow';
import { CartItem } from '@/types/types';  // Import the CartItem type

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Reject non-POST requests immediately
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { items, email, paymentMethod, phone } = req.body;
    
    // Diagnostic logging for transaction monitoring
    console.log('Payment initiation request:', {
      email,
      paymentMethod,
      itemCount: items.length,
      total: items.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0)
    });

    const paynowService = new PaynowService();

    let response;
    if (paymentMethod === 'web') {
      // Web payments (credit cards/bank transfers)
      response = await paynowService.initiateWebPayment(items, email);
    } else {
      // Mobile money payments (EcoCash/OneMoney)
      if (!phone) throw new Error('Phone number required for mobile payments');
      response = await paynowService.initiateMobilePayment(
        items,
        email,
        phone,
        'ecocash' // Supported methods: 'ecocash' | 'onemoney'
      );
    }

    // Log raw response for debugging purposes
    console.log('PayNow response:', response);
    
    if (!response.success) {
      return res.status(400).json({
        success: false,
        message: response.error || 'Payment initiation failed'
      });
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 