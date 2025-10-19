import { Controller, Post, Get, Patch, Param, Body, Query, HttpCode, UseGuards, Logger } from '@nestjs/common';
import { PaymentService, PaymentMethod } from './services/payment.service';
import { RazorpayService } from './services/razorpay.service';
import { PaymentProducer } from './kafka/payment.producer';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmCashPaymentDto, PaymentStatus } from './dto/confirm-cash-payment.dto';
import { VerifyRazorpayDto } from './dto/verify-razorpay.dto';
import { JwtGuard, TenantGuard, RequireRole } from '@shared/auth';

@Controller('api/payments')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private paymentService: PaymentService,
    private razorpayService: RazorpayService,
    private paymentProducer: PaymentProducer,
  ) {}

  /**
   * POST /api/payments/create-razorpay-order
   * Create a Razorpay order for payment (auth required)
   * Headers: Authorization: Bearer <token>
   * Returns mock Razorpay order details (in production, this calls Razorpay API)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @Post('create-razorpay-order')
  @HttpCode(200)
  async createRazorpayOrder(@Body() createPaymentDto: CreatePaymentDto, @Query('tenant_id') tenantId: string) {
    // Validate inputs
    if (!createPaymentDto.order_id || !createPaymentDto.amount) {
      return {
        status: 'error',
        message: 'order_id and amount are required',
      };
    }

    // Create payment record in DB
    const payment = await this.paymentService.createPayment(
      createPaymentDto.order_id,
      createPaymentDto.amount,
      PaymentMethod.RAZORPAY,
    );

    // Mock Razorpay order creation (no actual API call)
    const razorpayOrder = await this.razorpayService.createOrder(
      createPaymentDto.amount,
      createPaymentDto.order_id,
      {
        order_id: createPaymentDto.order_id,
      },
    );

    // Publish event
    await this.paymentProducer.publishPaymentCreated({
      payment_id: payment.id,
      order_id: payment.order_id,
      tenant_id: 'default_tenant',
      amount: payment.amount.toNumber(),
      method: 'RAZORPAY',
      razorpay_order_id: razorpayOrder.id,
    });

    return {
      status: 'ok',
      data: {
        payment_id: payment.id,
        razorpay_order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
          status: razorpayOrder.status,
          created_at: razorpayOrder.created_at,
        },
        message: '[MOCKED] Razorpay order created. Use razorpay_order.id in payment gateway.',
      },
    };
  }

  /**
   * POST /api/payments/verify-razorpay
   * Verify Razorpay payment signature (auth required)
   * Headers: Authorization: Bearer <token>
   * In production: verifies HMAC_SHA256(order_id|payment_id, secret) === signature
   * For testing: accepts any signature
   */
  @UseGuards(JwtGuard, TenantGuard)
  @Post('verify-razorpay')
  @HttpCode(200)
  async verifyRazorpay(@Body() verifyDto: VerifyRazorpayDto, @Query('tenant_id') tenantId: string) {
    // Validate inputs
    if (!verifyDto.razorpay_order_id || !verifyDto.razorpay_payment_id || !verifyDto.razorpay_signature) {
      return {
        status: 'error',
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
      };
    }

    // Verify signature (mocked)
    const isSignatureValid = this.razorpayService.verifySignature(
      verifyDto.razorpay_order_id,
      verifyDto.razorpay_payment_id,
      verifyDto.razorpay_signature,
    );

    if (!isSignatureValid) {
      return {
        status: 'error',
        message: 'Invalid Razorpay signature',
      };
    }

    // Get existing payment or create new one
    let payment = await this.paymentService.getPaymentByOrderId(verifyDto.order_id);

    if (!payment) {
      return {
        status: 'error',
        message: 'Payment not found for this order',
      };
    }

    // Update payment with Razorpay details
    payment = await this.paymentService.updateRazorpayPayment(
      payment.id,
      verifyDto.razorpay_order_id,
      verifyDto.razorpay_payment_id,
      'COMPLETED' as any,
    );

    // Mock Razorpay payment confirmation
    const confirmResult = await this.razorpayService.confirmPayment(
      verifyDto.razorpay_order_id,
      verifyDto.razorpay_payment_id,
    );

    // Publish payment.completed event
    await this.paymentProducer.publishPaymentCompleted({
      payment_id: payment.id,
      order_id: payment.order_id,
      tenant_id: 'default_tenant',
      amount: payment.amount.toNumber(),
      method: 'RAZORPAY',
      razorpay_payment_id: verifyDto.razorpay_payment_id,
    });

    return {
      status: 'ok',
      data: {
        payment_id: payment.id,
        order_id: payment.order_id,
        razorpay_payment_id: verifyDto.razorpay_payment_id,
        payment_status: payment.status,
        message: 'Razorpay payment verified and completed',
      },
    };
  }

  /**
   * POST /api/payments/confirm-cash
   * Confirm cash payment (waiter confirms payment at table, staff only)
   * Headers: Authorization: Bearer <token>
   * Auth: REQUIRED (JWT + Staff role + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @RequireRole(['staff'])
  @Post('confirm-cash')
  @HttpCode(200)
  async confirmCashPayment(@Body() confirmDto: ConfirmCashPaymentDto, @Query('tenant_id') tenantId: string) {
    // Validate inputs
    if (!confirmDto.order_id || !confirmDto.confirmed_by) {
      return {
        status: 'error',
        message: 'order_id and confirmed_by are required',
      };
    }

    // Confirm cash payment (assume standard amount received = full amount)
    const payment = await this.paymentService.confirmCashPayment(
      confirmDto.order_id,
      0, // amountReceived will be calculated from order
      confirmDto.confirmed_by,
    );

    // Publish payment.completed event
    await this.paymentProducer.publishPaymentCompleted({
      payment_id: payment.id,
      order_id: payment.order_id,
      tenant_id: 'default_tenant',
      amount: payment.amount.toNumber(),
      method: 'CASH',
    });

    return {
      status: 'ok',
      data: {
        payment_id: payment.id,
        order_id: payment.order_id,
        payment_status: payment.status,
        confirmed_by: payment.confirmed_by,
        amount: payment.amount.toNumber(),
        message: 'Cash payment confirmed',
      },
    };
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  health() {
    return { status: 'ok', service: 'payment-service', timestamp: new Date().toISOString() };
  }

  /**
   * GET /api/payments/stats/daily
   * Get payment statistics for a date range (auth required, staff only)
   * Headers: Authorization: Bearer <token>
   * Auth: REQUIRED (JWT + Staff role + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @RequireRole(['staff'])
  @Get('stats/daily')
  async getPaymentStats(
    @Query('date') date?: string, // YYYY-MM-DD format
    @Query('tenant_id') tenantId?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    const startDate = new Date(targetDate.setHours(0, 0, 0, 0));
    const endDate = new Date(targetDate.setHours(23, 59, 59, 999));

    const stats = await this.paymentService.getPaymentStats(startDate, endDate);

    return {
      status: 'ok',
      data: {
        date: targetDate.toISOString().split('T')[0],
        ...stats,
      },
    };
  }

  /**
   * GET /api/payments/:payment_id
   * Get payment details (auth required)
   * Headers: Authorization: Bearer <token>
   * Auth: REQUIRED (JWT + Tenant validation)
   */
  @UseGuards(JwtGuard, TenantGuard)
  @Get(':payment_id')
  async getPayment(@Param('payment_id') paymentId: string, @Query('tenant_id') tenantId: string) {

    const payment = await this.paymentService.getPaymentById(paymentId);

    if (!payment) {
      return {
        status: 'error',
        message: 'Payment not found',
      };
    }

    return {
      status: 'ok',
      data: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount.toNumber(),
        method: payment.payment_method,
        status: payment.status,
        razorpay_payment_id: payment.razorpay_payment_id,
        created_at: payment.created_at,
      },
    };
  }

  /**
   * GET /api/payments
   * List payments (with pagination)
   */
  @Get()
  async listPayments(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '50'), 100);
    const offsetNum = parseInt(offset || '0');

    const { payments, total } = await this.paymentService.listPayments(limitNum, offsetNum);

    return {
      status: 'ok',
      data: {
        payments: payments.map((p: any) => ({
          id: p.id,
          order_id: p.order_id,
          amount: p.amount.toNumber(),
          method: p.payment_method,
          status: p.status,
          created_at: p.created_at,
        })),
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total,
        },
      },
    };
  }
}

