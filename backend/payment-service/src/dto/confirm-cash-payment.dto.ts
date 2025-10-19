import { IsString, IsEnum } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class ConfirmCashPaymentDto {
  @IsString()
  order_id: string;

  @IsString()
  tenant_id: string;

  @IsString()
  confirmed_by: string; // staff_id/waiter_id
}
