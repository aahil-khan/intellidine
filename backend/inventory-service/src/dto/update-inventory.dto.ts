import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  reorder_level?: number;

  @IsString()
  @IsOptional()
  unit?: string;
}
