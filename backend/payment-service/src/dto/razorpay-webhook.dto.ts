import { IsString } from 'class-validator';

export class RazorpayWebhookDto {
  @IsString()
  event: string;

  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        description: string;
        amount_refunded: number;
        refund_status: string;
        captured: boolean;
        notes: Record<string, any>;
      };
    };
  };
}
