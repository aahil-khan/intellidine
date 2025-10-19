import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  item_name: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  reorder_level: number;

  @IsString()
  @IsOptional()
  unit?: string; // e.g., "kg", "liters", "pieces"

  @IsUUID()
  tenant_id: string;
}
