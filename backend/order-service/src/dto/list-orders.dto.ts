import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class ListOrdersQueryDto {
  @IsString()
  tenant_id!: string; // Restaurant ID

  @IsOptional()
  @IsString()
  status!: string; // Filter by status (e.g., "PENDING", "COMPLETED")

  @IsOptional()
  @IsString()
  table_id!: string; // Filter by table

  @IsOptional()
  @IsString()
  customer_id!: string; // Filter by customer

  @IsOptional()
  @IsNumber()
  @Min(1)
  page!: number; // Pagination (default: 1)

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit!: number; // Items per page (default: 10, max: 100)

  @IsOptional()
  @IsString()
  sort_by!: string; // "created_at", "total", "status" (default: "created_at")

  @IsOptional()
  @IsString()
  sort_order!: string; // "asc", "desc" (default: "desc")

  @IsOptional()
  @IsString()
  date_from!: string; // ISO date string (e.g., "2025-10-19")

  @IsOptional()
  @IsString()
  date_to!: string; // ISO date string (e.g., "2025-10-19")
}
