export class OrderItemResponseDto {
  id!: string;
  order_id!: string;
  menu_item_id!: string;
  quantity!: number;
  price_at_order!: number; // Price when order was placed
  subtotal!: number; // quantity * price_at_order
  special_instructions?: string;
  created_at!: Date;
}

export class OrderResponseDto {
  id!: string;
  tenant_id!: string;
  table_id!: string;
  customer_id?: string;
  status!: string; // "PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"
  
  items!: OrderItemResponseDto[];
  
  // Financial breakdown
  subtotal!: number; // Sum of all item subtotals
  discount_amount!: number;
  discount_reason?: string;
  tax_amount!: number;
  delivery_charge!: number;
  total!: number; // subtotal - discount + tax + delivery_charge
  
  // Payment & Order metadata
  payment_method!: string; // "cash", "card", "upi", "prepaid"
  payment_status!: string; // "pending", "completed", "refunded"
  special_instructions?: string;
  
  // Timestamps
  created_at!: Date;
  confirmed_at?: Date;
  started_at?: Date;
  ready_at?: Date;
  completed_at?: Date;
  
  // Estimated prep time
  estimated_prep_time!: number; // Minutes
  estimated_ready_at?: Date;
  
  notes?: string;
}

export class OrderListResponseDto {
  id!: string;
  table_id!: string;
  customer_id?: string;
  status!: string;
  total!: number;
  items_count!: number;
  created_at!: Date;
  estimated_ready_at?: Date;
}
