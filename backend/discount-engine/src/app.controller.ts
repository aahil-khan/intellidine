import { Controller, Post, Get, Param, Body, Query, Logger } from '@nestjs/common';
import { DiscountRuleEngine } from './services/discount-rule.service';
import {
  DiscountEvaluationContext,
  DiscountRule,
  DiscountRuleType,
  TimeBasedRule,
  VolumeBasedRule,
  ItemSpecificRule,
  CustomerSegmentRule,
} from './models/discount-rule';

@Controller('api/discount')
export class AppController {
  private readonly logger = new Logger('DiscountEngineController');

  constructor(private readonly discountRuleEngine: DiscountRuleEngine) {}

  /**
   * Health check endpoint
   */
  @Get('/health')
  health() {
    return {
      status: 'healthy',
      service: 'discount-engine',
      timestamp: new Date(),
    };
  }

  /**
   * Evaluate discounts for an order
   * POST /api/discount/evaluate
   */
  @Post('/evaluate')
  evaluateDiscounts(@Body() context: DiscountEvaluationContext) {
    this.logger.log(`Evaluating discounts for order ${context.orderId}`);

    try {
      const result = this.discountRuleEngine.evaluateDiscounts(context);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error evaluating discounts: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all rules for a tenant
   * GET /api/discount/rules?tenant=default
   * Also accessible as: GET /api/discounts/rules (Postman compatibility)
   */
  @Get('/rules')
  getTenantRules(@Query('tenant') tenantId: string = 'default') {
    this.logger.log(`Fetching rules for tenant ${tenantId}`);

    try {
      const rules = this.discountRuleEngine.getTenantRules(tenantId);

      return {
        success: true,
        tenantId,
        ruleCount: rules.length,
        data: rules,
      };
    } catch (error) {
      this.logger.error(`Error fetching rules: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Alias: /api/discounts/rules
   * GET /api/discounts/rules?tenant_id=...&tenant=...
   */
  @Get('/discounts/rules')
  getDiscountsRulesAlias(
    @Query('tenant_id') tenantId?: string,
    @Query('tenant') tenantAlt?: string,
  ) {
    const tid = tenantId || tenantAlt || 'default';
    this.logger.log(`Fetching rules for tenant ${tid} (alias endpoint)`);

    try {
      const rules = this.discountRuleEngine.getTenantRules(tid);

      return {
        success: true,
        tenantId: tid,
        ruleCount: rules.length,
        data: rules,
      };
    } catch (error) {
      this.logger.error(`Error fetching rules: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply discount (alias for /evaluate)
   * POST /api/discount/apply or /api/discounts/apply
   * For Postman compatibility
   */
  @Post('/apply')
  applyDiscountAlias(@Body() context: DiscountEvaluationContext) {
    this.logger.log(`Applying discounts for order ${context.orderId} (alias endpoint)`);

    try {
      const result = this.discountRuleEngine.evaluateDiscounts(context);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error applying discounts: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Alias: /api/discounts/apply
   * POST /api/discounts/apply
   */
  @Post('/discounts/apply')
  applyDiscountsAlias(@Body() context: DiscountEvaluationContext) {
    this.logger.log(`Applying discounts for order ${context.orderId} (discounts alias)`);

    try {
      const result = this.discountRuleEngine.evaluateDiscounts(context);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error applying discounts: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add a new discount rule
   * POST /api/discount/rules
   */
  @Post('/rules')
  addRule(
    @Query('tenant') tenantId: string = 'default',
    @Body() rule: DiscountRule,
  ) {
    this.logger.log(`Adding rule "${rule.name}" for tenant ${tenantId}`);

    try {
      this.discountRuleEngine.addRule(tenantId, rule);

      return {
        success: true,
        message: `Rule "${rule.name}" added successfully`,
        data: rule,
      };
    } catch (error) {
      this.logger.error(`Error adding rule: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get rule templates for different discount types
   * GET /api/discount/templates
   */
  @Get('/templates')
  getRuleTemplates() {
    this.logger.log('Fetching rule templates');

    const templates = {
      TIME_BASED: {
        type: DiscountRuleType.TIME_BASED,
        template: {
          name: 'Lunch Special',
          startHour: 11,
          endHour: 14,
          discountPercent: 15,
          daysOfWeek: [1, 2, 3, 4, 5],
          active: true,
        } as TimeBasedRule,
        description: 'Apply discount during specific hours on selected days',
      },
      VOLUME_BASED: {
        type: DiscountRuleType.VOLUME_BASED,
        template: {
          name: 'Bulk Order Discount',
          minItems: 10,
          maxItems: undefined,
          discountPercent: 20,
          active: true,
        } as VolumeBasedRule,
        description: 'Apply discount when order has minimum number of items',
      },
      ITEM_SPECIFIC: {
        type: DiscountRuleType.ITEM_SPECIFIC,
        template: {
          name: 'Pizza Special',
          menuItemIds: ['uuid-1', 'uuid-2'],
          discountPercent: 10,
          minQuantity: 2,
          active: true,
        } as ItemSpecificRule,
        description: 'Apply discount on specific menu items',
      },
      CUSTOMER_SEGMENT: {
        type: DiscountRuleType.CUSTOMER_SEGMENT,
        template: {
          name: 'VIP Discount',
          customerTypes: ['vip'],
          discountPercent: 25,
          maxUsagePerCustomer: 10,
          active: true,
        } as CustomerSegmentRule,
        description: 'Apply discount for specific customer types',
      },
      ML_RECOMMENDED: {
        type: DiscountRuleType.ML_RECOMMENDED,
        template: {
          name: 'ML-Based Dynamic Discount',
          shadowMode: true,
          minConfidence: 0.65,
          discountRange: [5, 25],
          active: true,
          modelVersion: '1.0',
        },
        description: 'ML model provides discount recommendations (shadow mode for A/B testing)',
      },
    };

    return {
      success: true,
      templates,
    };
  }

  /**
   * Simulate discount evaluation with sample data
   * POST /api/discount/simulate
   */
  @Post('/simulate')
  simulateEvaluation(@Query('tenant') tenantId: string = 'default') {
    this.logger.log(`Simulating discount evaluation for tenant ${tenantId}`);

    try {
      // Create sample context
      const sampleContext: DiscountEvaluationContext = {
        tenantId,
        orderId: 'order-simulation-' + Date.now(),
        customerId: 'cust-001',
        customerType: 'repeat',
        orderItems: [
          { menuItemId: 'item-1', quantity: 3, basePrice: 250 },
          { menuItemId: 'item-2', quantity: 2, basePrice: 350 },
        ],
        totalAmount: 1550,
        orderTime: new Date(),
        paymentMethod: 'razorpay',
      };

      const result = this.discountRuleEngine.evaluateDiscounts(sampleContext);

      return {
        success: true,
        message: 'Discount simulation completed',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error simulating discount: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get discount statistics
   * GET /api/discount/stats?tenant=default
   */
  @Get('/stats')
  getDiscountStats(@Query('tenant') tenantId: string = 'default') {
    this.logger.log(`Fetching discount stats for tenant ${tenantId}`);

    try {
      const rules = this.discountRuleEngine.getTenantRules(tenantId);
      const activeRules = rules.filter(r => r.active);
      
      const rulesByType = {
        [DiscountRuleType.TIME_BASED]: rules.filter(r => r.type === DiscountRuleType.TIME_BASED).length,
        [DiscountRuleType.VOLUME_BASED]: rules.filter(r => r.type === DiscountRuleType.VOLUME_BASED).length,
        [DiscountRuleType.ITEM_SPECIFIC]: rules.filter(r => r.type === DiscountRuleType.ITEM_SPECIFIC).length,
        [DiscountRuleType.CUSTOMER_SEGMENT]: rules.filter(r => r.type === DiscountRuleType.CUSTOMER_SEGMENT).length,
        [DiscountRuleType.ML_RECOMMENDED]: rules.filter(r => r.type === DiscountRuleType.ML_RECOMMENDED).length,
      };

      return {
        success: true,
        tenantId,
        stats: {
          totalRules: rules.length,
          activeRules: activeRules.length,
          rulesByType,
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching stats: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

