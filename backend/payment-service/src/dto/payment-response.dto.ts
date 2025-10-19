export class PaymentResponseDto {
  id: string;
  order_id: string;
  tenant_id: string;
  amount: number;
  method: string;
  status: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
