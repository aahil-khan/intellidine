import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key';
  private readonly RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_key';

  // Mock Razorpay order creation (no actual API call)
  async createOrder(amount: number, receipt: string, notes: Record<string, any> = {}): Promise<RazorpayOrder> {
    const orderId = `order_${uuidv4().substring(0, 12)}`;

    return {
      id: orderId,
      entity: 'order',
      amount: amount * 100, // amount in paise
      amount_paid: 0,
      amount_due: amount * 100,
      currency: 'INR',
      receipt,
      offer_id: null,
      status: 'created',
      attempts: 0,
      notes,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Mock signature verification (no actual cryptographic verification)
  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    // In production, this would verify: HMAC_SHA256(orderId|paymentId, RAZORPAY_KEY_SECRET) === signature
    // For mocking, we'll accept any signature as valid
    this.logger.debug(`[MOCK] Verifying Razorpay signature for ${orderId} | ${paymentId}`);
    return true;
  }

  // Generate mock signature for testing
  generateMockSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', this.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  // Mock payment confirmation (simulates webhook callback)
  async confirmPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ): Promise<{ status: string; message: string }> {
    this.logger.debug(`[MOCK] Confirming Razorpay payment: ${razorpayPaymentId} for order: ${razorpayOrderId}`);

    return {
      status: 'captured',
      message: 'Payment successfully captured',
    };
  }
}
