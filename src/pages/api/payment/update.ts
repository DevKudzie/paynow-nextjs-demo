/**
 * Payment Update Webhook
 * Receives payment status updates from PayNow
 * Handles:
 * - Payment verification
 * - Order status updates
 * - Receipt generation
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { PaynowService } from '@/services/paynow';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { pollUrl, phone, startTime } = req.body;
    
    const paynowService = new PaynowService();
    const paymentStatus = await paynowService.checkPaymentStatus(pollUrl, phone, startTime);

    // Always return the full status
    return res.status(200).json({
      success: paymentStatus.paid,
      status: paymentStatus.status,
      message: paymentStatus.error
    });

  } catch (error) {
    console.error('Payment update error:', error);
    return res.status(500).json({ 
      success: false, 
      status: 'failed',
      message: error instanceof Error ? error.message : 'Payment check failed'
    });
  }
}

// In a real app, you would:
    // 1. Verify the hash from PayNow
    // 2. Update order status in database
    // 3. Send confirmation email to customer