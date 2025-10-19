import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GetMenuQueryDto {
  @IsString()
  @IsOptional()
  tenant_id?: string;

  @IsString()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsString()
  @IsOptional()
  sort_by?: 'name' | 'price' | 'preparation_time';

  @IsString()
  @IsOptional()
  sort_order?: 'asc' | 'desc';
}
