/**
 * Discount Rule Models
 * Defines types for different discount rule types
 */

export enum DiscountRuleType {
  TIME_BASED = 'TIME_BASED',           // Discounts during specific hours
  VOLUME_BASED = 'VOLUME_BASED',       // Discounts based on order quantity
  ITEM_SPECIFIC = 'ITEM_SPECIFIC',     // Discounts on specific menu items
  CUSTOMER_SEGMENT = 'CUSTOMER_SEGMENT', // Discounts for customer types
  ML_RECOMMENDED = 'ML_RECOMMENDED',   // ML model recommendations (shadow mode)
}

export interface TimeBasedRule {
  type: DiscountRuleType.TIME_BASED;
  name: string;
  startHour: number;      // 0-23 in 24hr format
  endHour: number;
  discountPercent: number; // 5-50%
  daysOfWeek: number[];    // 0=Sunday, 6=Saturday
  active: boolean;
}

export interface VolumeBasedRule {
  type: DiscountRuleType.VOLUME_BASED;
  name: string;
  minItems: number;       // Minimum items to qualify
  maxItems?: number;      // Optional upper limit
  discountPercent: number;
  active: boolean;
}

export interface ItemSpecificRule {
  type: DiscountRuleType.ITEM_SPECIFIC;
  name: string;
  menuItemIds: string[];  // UUIDs of menu items
  discountPercent: number;
  minQuantity: number;
  active: boolean;
}

export interface CustomerSegmentRule {
  type: DiscountRuleType.CUSTOMER_SEGMENT;
  name: string;
  customerTypes: ('new' | 'repeat' | 'vip')[];
  discountPercent: number;
  maxUsagePerCustomer: number;
  active: boolean;
}

export interface MLRecommendedRule {
  type: DiscountRuleType.ML_RECOMMENDED;
  name: string;
  shadowMode: boolean;     // If true, only log recommendation, don't apply
  minConfidence: number;   // 0-1, minimum confidence threshold
  discountRange: [number, number]; // [min%, max%]
  active: boolean;
  modelVersion: string;
}

export type DiscountRule = 
  | TimeBasedRule
  | VolumeBasedRule
  | ItemSpecificRule
  | CustomerSegmentRule
  | MLRecommendedRule;

export interface DiscountEvaluationContext {
  tenantId: string;
  orderId: string;
  customerId?: string;
  customerType?: 'new' | 'repeat' | 'vip'; // Determined from customer history
  orderItems: {
    menuItemId: string;
    quantity: number;
    basePrice: number;
  }[];
  totalAmount: number;
  orderTime: Date;
  paymentMethod?: 'cash' | 'razorpay';
}

export interface DiscountRecommendation {
  ruleId: string;
  ruleType: DiscountRuleType;
  ruleName: string;
  discountPercent: number;
  discountAmount: number;
  confidence?: number;  // For ML recommendations
  reasoning: string;
  applied: boolean;
  shadowMode?: boolean; // For ML shadow mode
}

export interface DiscountEvaluationResult {
  orderId: string;
  tenantId: string;
  recommendations: DiscountRecommendation[];
  appliedDiscount: {
    percent: number;
    amount: number;
    ruleId: string;
    ruleName: string;
  } | null;
  totalDiscountAmount: number;
  finalAmount: number;
  mlShadowRecommendations: DiscountRecommendation[]; // Recommendations not applied
  timestamp: Date;
}
