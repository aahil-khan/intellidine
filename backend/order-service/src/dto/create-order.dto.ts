import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @IsString()
  table_id!: string; // Table number/identifier

  @IsString()
  tenant_id!: string; // Restaurant ID

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[]; // Array of menu items with quantities

  @IsOptional()
  @IsString()
  special_instructions!: string; // General order instructions (e.g., "deliver to table 5 asap")

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount!: number; // Discount in currency (₹)

  @IsOptional()
  @IsString()
  discount_reason!: string; // Why discount was applied (e.g., "loyalty program", "promotional code")

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_amount!: number; // Tax in currency (₹)

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_charge!: number; // Delivery/packaging charge (₹) for delivery orders

  @IsOptional()
  @IsString()
  customer_id!: string; // Customer ID if known (optional for walk-in orders)

  @IsOptional()
  @IsString()
  payment_method!: string; // "cash", "card", "upi", "prepaid" (default: "cash")
}
