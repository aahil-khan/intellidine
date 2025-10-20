import { Injectable, Logger } from '@nestjs/common';
import {
  DiscountRule,
  DiscountRuleType,
  DiscountEvaluationContext,
  DiscountEvaluationResult,
  DiscountRecommendation,
  TimeBasedRule,
  VolumeBasedRule,
  ItemSpecificRule,
  CustomerSegmentRule,
  MLRecommendedRule,
} from '../models/discount-rule';

/**
 * Discount Rule Engine
 * Evaluates all applicable discount rules for a given order
 * Supports time-based, volume-based, item-specific, and ML-recommended rules
 */
@Injectable()
export class DiscountRuleEngine {
  private readonly logger = new Logger('DiscountRuleEngine');
  
  // In-memory rule storage (in production, this would be in database)
  private rules: Map<string, DiscountRule[]> = new Map();

  constructor() {
    // Initialize with default rules for tenant 'default'
    this.initializeDefaultRules();
  }

  /**
   * Initialize default rules for testing
   */
  private initializeDefaultRules() {
    const defaultRules: DiscountRule[] = [
      // Lunch special: 15% off 11am-2pm
      {
        type: DiscountRuleType.TIME_BASED,
        name: 'Lunch Special',
        startHour: 11,
        endHour: 14,
        discountPercent: 15,
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        active: true,
      } as TimeBasedRule,
      
      // Dinner special: 10% off 6pm-9pm
      {
        type: DiscountRuleType.TIME_BASED,
        name: 'Dinner Special',
        startHour: 18,
        endHour: 21,
        discountPercent: 10,
        daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
        active: true,
      } as TimeBasedRule,

      // Bulk order discount: 20% off 10+ items
      {
        type: DiscountRuleType.VOLUME_BASED,
        name: 'Bulk Order Discount',
        minItems: 10,
        discountPercent: 20,
        active: true,
      } as VolumeBasedRule,

      // Medium order discount: 10% off 5-9 items
      {
        type: DiscountRuleType.VOLUME_BASED,
        name: 'Medium Order Discount',
        minItems: 5,
        maxItems: 9,
        discountPercent: 10,
        active: true,
      } as VolumeBasedRule,

      // ML-recommended discount (shadow mode for learning)
      {
        type: DiscountRuleType.ML_RECOMMENDED,
        name: 'ML-Based Dynamic Discount',
        shadowMode: true,
        minConfidence: 0.65,
        discountRange: [5, 25],
        active: true,
        modelVersion: '1.0',
      } as MLRecommendedRule,
    ];

    this.rules.set('default', defaultRules);
  }

  /**
   * Register custom discount rules for a tenant
   */
  registerRules(tenantId: string, rules: DiscountRule[]): void {
    this.rules.set(tenantId, rules);
    this.logger.log(`Registered ${rules.length} rules for tenant ${tenantId}`);
  }

  /**
   * Evaluate all applicable discount rules
   */
  evaluateDiscounts(context: DiscountEvaluationContext): DiscountEvaluationResult {
    const tenantId = context.tenantId || 'default';
    const rules = this.rules.get(tenantId) || this.rules.get('default') || [];
    
    const recommendations: DiscountRecommendation[] = [];
    const mlShadowRecommendations: DiscountRecommendation[] = [];

    // Evaluate each rule
    for (const rule of rules) {
      if (!rule.active) continue;

      const recommendation = this.evaluateRule(rule, context);
      if (recommendation) {
        if (rule.type === DiscountRuleType.ML_RECOMMENDED && (rule as MLRecommendedRule).shadowMode) {
          mlShadowRecommendations.push(recommendation);
        } else {
          recommendations.push(recommendation);
        }
      }
    }

    // Select best discount (highest percent)
    const selectedRecommendation = this.selectBestDiscount(recommendations, context);

    const totalDiscountAmount = selectedRecommendation
      ? (selectedRecommendation.discountAmount || 0)
      : 0;

    const appliedDiscount = selectedRecommendation ? {
      percent: selectedRecommendation.discountPercent,
      amount: selectedRecommendation.discountAmount,
      ruleId: selectedRecommendation.ruleId,
      ruleName: selectedRecommendation.ruleName,
    } : null;

    return {
      orderId: context.orderId,
      tenantId,
      recommendations,
      appliedDiscount,
      totalDiscountAmount,
      mlShadowRecommendations,
      finalAmount: context.totalAmount - totalDiscountAmount,
      timestamp: new Date(),
    };
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: DiscountRule, context: DiscountEvaluationContext): DiscountRecommendation | null {
    switch (rule.type) {
      case DiscountRuleType.TIME_BASED:
        return this.evaluateTimeBasedRule(rule as TimeBasedRule, context);
      
      case DiscountRuleType.VOLUME_BASED:
        return this.evaluateVolumeBasedRule(rule as VolumeBasedRule, context);
      
      case DiscountRuleType.ITEM_SPECIFIC:
        return this.evaluateItemSpecificRule(rule as ItemSpecificRule, context);
      
      case DiscountRuleType.CUSTOMER_SEGMENT:
        return this.evaluateCustomerSegmentRule(rule as CustomerSegmentRule, context);
      
      case DiscountRuleType.ML_RECOMMENDED:
        return this.evaluateMLRecommendedRule(rule as MLRecommendedRule, context);
      
      default:
        return null;
    }
  }

  /**
   * Evaluate time-based discount rules
   */
  private evaluateTimeBasedRule(
    rule: TimeBasedRule,
    context: DiscountEvaluationContext,
  ): DiscountRecommendation | null {
    const orderDate = new Date(context.orderTime);
    const currentHour = orderDate.getHours();
    const dayOfWeek = orderDate.getDay();

    // Check if current time falls within rule window
    const isWithinTimeWindow = rule.startHour <= currentHour && currentHour < rule.endHour;
    const isWithinDays = rule.daysOfWeek.includes(dayOfWeek);

    if (isWithinTimeWindow && isWithinDays) {
      const discountAmount = (context.totalAmount * rule.discountPercent) / 100;
      
      return {
        ruleId: `time-${rule.name.toLowerCase().replace(/\s+/g, '-')}`,
        ruleType: DiscountRuleType.TIME_BASED,
        ruleName: rule.name,
        discountPercent: rule.discountPercent,
        discountAmount,
        reasoning: `${rule.name}: ${rule.startHour}:00-${rule.endHour}:00 discount applicable`,
        applied: false,
      };
    }

    return null;
  }

  /**
   * Evaluate volume-based discount rules
   */
  private evaluateVolumeBasedRule(
    rule: VolumeBasedRule,
    context: DiscountEvaluationContext,
  ): DiscountRecommendation | null {
    const totalItems = context.orderItems.reduce((sum, item) => sum + item.quantity, 0);

    const meetsMinimum = totalItems >= rule.minItems;
    const meetsMaximum = !rule.maxItems || totalItems <= rule.maxItems;

    if (meetsMinimum && meetsMaximum) {
      const discountAmount = (context.totalAmount * rule.discountPercent) / 100;
      
      return {
        ruleId: `volume-${rule.name.toLowerCase().replace(/\s+/g, '-')}`,
        ruleType: DiscountRuleType.VOLUME_BASED,
        ruleName: rule.name,
        discountPercent: rule.discountPercent,
        discountAmount,
        reasoning: `${rule.name}: ${totalItems} items ordered`,
        applied: false,
      };
    }

    return null;
  }

  /**
   * Evaluate item-specific discount rules
   */
  private evaluateItemSpecificRule(
    rule: ItemSpecificRule,
    context: DiscountEvaluationContext,
  ): DiscountRecommendation | null {
    // Check if any items in the order match the rule's menu item IDs
    const matchingItems = context.orderItems.filter(item =>
      rule.menuItemIds.includes(item.menuItemId),
    );

    const totalMatchingQuantity = matchingItems.reduce((sum, item) => sum + item.quantity, 0);

    if (totalMatchingQuantity >= rule.minQuantity) {
      // Calculate discount on matching items only
      const matchingItemsPrice = matchingItems.reduce(
        (sum, item) => sum + item.basePrice * item.quantity,
        0,
      );
      const discountAmount = (matchingItemsPrice * rule.discountPercent) / 100;

      return {
        ruleId: `item-${rule.name.toLowerCase().replace(/\s+/g, '-')}`,
        ruleType: DiscountRuleType.ITEM_SPECIFIC,
        ruleName: rule.name,
        discountPercent: rule.discountPercent,
        discountAmount,
        reasoning: `${rule.name}: ${totalMatchingQuantity} qualifying items`,
        applied: false,
      };
    }

    return null;
  }

  /**
   * Evaluate customer segment discount rules
   */
  private evaluateCustomerSegmentRule(
    rule: CustomerSegmentRule,
    context: DiscountEvaluationContext,
  ): DiscountRecommendation | null {
    if (!context.customerType) return null;

    if (rule.customerTypes.includes(context.customerType)) {
      const discountAmount = (context.totalAmount * rule.discountPercent) / 100;

      return {
        ruleId: `segment-${rule.name.toLowerCase().replace(/\s+/g, '-')}`,
        ruleType: DiscountRuleType.CUSTOMER_SEGMENT,
        ruleName: rule.name,
        discountPercent: rule.discountPercent,
        discountAmount,
        reasoning: `${rule.name}: ${context.customerType} customer`,
        applied: false,
      };
    }

    return null;
  }

  /**
   * Evaluate ML-recommended discount rules
   * In shadow mode, recommendations are not applied but logged
   */
  private evaluateMLRecommendedRule(
    rule: MLRecommendedRule,
    context: DiscountEvaluationContext,
  ): DiscountRecommendation | null {
    // Simulate ML model prediction (in production, call actual ML service)
    const mlPrediction = this.getMLPrediction(context);

    if (mlPrediction && mlPrediction.confidence >= rule.minConfidence) {
      const discountPercent = Math.min(
        Math.max(mlPrediction.recommendedDiscount, rule.discountRange[0]),
        rule.discountRange[1],
      );

      const discountAmount = (context.totalAmount * discountPercent) / 100;

      return {
        ruleId: `ml-${rule.name.toLowerCase().replace(/\s+/g, '-')}`,
        ruleType: DiscountRuleType.ML_RECOMMENDED,
        ruleName: rule.name,
        discountPercent,
        discountAmount,
        confidence: mlPrediction.confidence,
        reasoning: `ML-based recommendation (v${rule.modelVersion}, confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%)`,
        applied: !rule.shadowMode,
        shadowMode: rule.shadowMode,
      };
    }

    return null;
  }

  /**
   * Simulate ML model prediction
   * In production, this would call the actual ML service endpoint
   */
  private getMLPrediction(context: DiscountEvaluationContext): {
    recommendedDiscount: number;
    confidence: number;
  } | null {
    // Simulate ML prediction based on simple heuristics
    const totalItems = context.orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const avgPrice = context.totalAmount / totalItems;
    const orderTime = new Date(context.orderTime);
    const hour = orderTime.getHours();

    // Simple ML simulation:
    // - Peak hours (11-14, 18-21) suggest 12% discount, high confidence
    // - Off-peak with many items (>8) suggest 15% discount, medium confidence
    // - Low-value orders suggest 8% discount, low confidence

    if ((hour >= 11 && hour < 14) || (hour >= 18 && hour < 21)) {
      return { recommendedDiscount: 12, confidence: 0.78 };
    }

    if (totalItems > 8) {
      return { recommendedDiscount: 15, confidence: 0.65 };
    }

    if (avgPrice < 200) {
      return { recommendedDiscount: 8, confidence: 0.55 };
    }

    return null;
  }

  /**
   * Select the best discount from available recommendations
   * Rule: Pick the highest discount, but avoid duplicate types
   */
  private selectBestDiscount(
    recommendations: DiscountRecommendation[],
    context: DiscountEvaluationContext,
  ): DiscountRecommendation | null {
    if (recommendations.length === 0) return null;

    // Sort by discount percent (descending) then by confidence if available
    const sorted = recommendations.sort((a, b) => {
      if (b.discountPercent !== a.discountPercent) {
        return b.discountPercent - a.discountPercent;
      }
      return (b.confidence || 0) - (a.confidence || 0);
    });

    // Apply the best discount
    const bestDiscount = sorted[0];
    bestDiscount.applied = true;

    this.logger.log(
      `Selected discount: ${bestDiscount.ruleName} (${bestDiscount.discountPercent}%) for order ${context.orderId}`,
    );

    return bestDiscount;
  }

  /**
   * Get all active rules for a tenant
   */
  getTenantRules(tenantId: string): DiscountRule[] {
    return this.rules.get(tenantId) || this.rules.get('default') || [];
  }

  /**
   * Add a new rule for a tenant
   */
  addRule(tenantId: string, rule: DiscountRule): void {
    if (!this.rules.has(tenantId)) {
      this.rules.set(tenantId, []);
    }
    this.rules.get(tenantId)?.push(rule);
    this.logger.log(`Added rule "${rule.name}" to tenant ${tenantId}`);
  }

  /**
   * Update an existing rule
   */
  updateRule(tenantId: string, ruleIndex: number, updatedRule: DiscountRule): void {
    const rules = this.rules.get(tenantId);
    if (rules && rules[ruleIndex]) {
      rules[ruleIndex] = updatedRule;
      this.logger.log(`Updated rule at index ${ruleIndex} for tenant ${tenantId}`);
    }
  }

  /**
   * Disable a rule
   */
  disableRule(tenantId: string, ruleIndex: number): void {
    const rules = this.rules.get(tenantId);
    if (rules && rules[ruleIndex]) {
      rules[ruleIndex].active = false;
      this.logger.log(`Disabled rule at index ${ruleIndex} for tenant ${tenantId}`);
    }
  }
}
