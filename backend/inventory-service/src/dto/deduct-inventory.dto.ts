import { IsNumber, IsUUID, Min } from 'class-validator';

export class DeductInventoryDto {
  @IsUUID()
  inventory_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsUUID()
  order_id: string;
}
