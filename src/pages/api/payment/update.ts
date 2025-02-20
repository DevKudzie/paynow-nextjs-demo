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
    const { pollUrl } = req.body;
    
    // Initialize service and check payment status
    const paynowService = new PaynowService();
    const isPaid = await paynowService.checkPaymentStatus(pollUrl);

    if (isPaid) {
      // TODO: Update order status in database
      // TODO: Send confirmation email
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment not confirmed' 
      });
    }
  } catch (error) {
    console.error('Payment update error:', error);
    return res.status(500).json({ success: false });
  }
}

// In a real app, you would:
    // 1. Verify the hash from PayNow
    // 2. Update order status in database
    // 3. Send confirmation email to customer