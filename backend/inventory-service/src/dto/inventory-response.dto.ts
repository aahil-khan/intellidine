export class InventoryResponseDto {
  id: string;
  item_name: string;
  quantity: number;
  reorder_level: number;
  unit?: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export class ReorderAlertDto {
  id: string;
  inventory_id: string;
  item_name: string;
  current_quantity: number;
  reorder_level: number;
  alert_status: 'URGENT' | 'WARNING'; // URGENT if < reorder_level, WARNING if < 1.5x reorder_level
  created_at: Date;
}

export class InventoryStatsDto {
  total_items: number;
  items_below_reorder_level: number;
  total_quantity: number;
  urgent_alerts: number;
  warning_alerts: number;
}
