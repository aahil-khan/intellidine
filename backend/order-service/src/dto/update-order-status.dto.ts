import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  status!: string; // "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"

  @IsOptional()
  @IsString()
  notes!: string; // Status change notes (e.g., "Customer delayed", "Ran out of ingredient")

  @IsOptional()
  @IsNumber()
  estimated_time_remaining?: number; // Estimated minutes until order is ready
}
