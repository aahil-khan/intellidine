import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsBoolean, Min } from 'class-validator';

export class UpdateMenuItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cost_price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_percentage?: number;

  @IsArray()
  @IsOptional()
  dietary_tags?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  preparation_time?: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}
