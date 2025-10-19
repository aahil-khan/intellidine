import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export enum PaymentMethod {
  RAZORPAY = 'RAZORPAY',
  CASH = 'CASH',
}

export class CreatePaymentDto {
  @IsString()
  order_id: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  tenant_id: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
