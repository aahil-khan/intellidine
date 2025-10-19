import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class OrderItemDto {
  @IsString()
  menu_item_id!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_at_order!: number; // Price when order was created (for historical tracking)

  @IsOptional()
  @IsString()
  special_instructions!: string; // Item-specific cooking instructions (e.g., "extra spice", "no onions")
}
