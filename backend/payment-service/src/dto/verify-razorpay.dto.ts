import { IsString, IsNumber } from 'class-validator';

export class VerifyRazorpayDto {
  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_signature: string;

  @IsString()
  order_id: string;

  @IsString()
  tenant_id: string;
}
