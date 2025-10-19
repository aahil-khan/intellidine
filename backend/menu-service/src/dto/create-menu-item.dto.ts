import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, Min } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  category_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price!: number;

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
}
