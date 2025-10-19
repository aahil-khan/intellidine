export class SocketEventDto {
  eventType:
    | 'order:created'
    | 'order:status_changed'
    | 'order:completed'
    | 'order:cancelled'
    | 'kitchen:order_received'
    | 'kitchen:order_ready'
    | 'kitchen:order_serving'
    | 'manager:payment_confirmed'
    | 'manager:inventory_low'
    | 'manager:order_spike'
    | 'manager:alert'
    | 'customer:order_status'
    | 'customer:payment_confirmed'
    | 'customer:payment_failed'
    | 'customer:order_ready';

  data: Record<string, any>;
  timestamp: string;
  source: 'kafka' | 'api' | 'system';
  tenantId?: string;
  userId?: string;
}

export class SubscribeDto {
  tenant_id: string;
  room?: 'orders' | 'kitchen' | 'managers' | 'customers';
}

export class SocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export class NotificationEvent {
  event_type: string;
  data: {
    tenant_id: string;
    order_id?: string;
    customer_id?: string;
    item_id?: string;
    [key: string]: any;
  };
}
