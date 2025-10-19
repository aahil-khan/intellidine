import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  RAZORPAY = 'RAZORPAY',
  CASH = 'CASH',
}

@Injectable()
export class PaymentService {
  constructor(private prismaService: PrismaService) {}

  // Create payment (for Razorpay)
  async createPayment(
    orderId: string,
    amount: number,
    method: PaymentMethod,
    customerId?: string,
    notes?: string,
  ) {
    const paymentId = uuidv4();

    const payment = await this.prismaService.payment.create({
      data: {
        id: paymentId,
        order_id: orderId,
        amount,
        payment_method: method,
        status: PaymentStatus.PENDING,
      },
    });

    return payment;
  }

  // Update payment after Razorpay verification
  async updateRazorpayPayment(
    paymentId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    status: PaymentStatus,
  ) {
    const payment = await this.prismaService.payment.update({
      where: { id: paymentId },
      data: {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        status,
      },
    });

    return payment;
  }

  // Confirm cash payment
  async confirmCashPayment(orderId: string, amountReceived: number, confirmedBy: string) {
    // Find or create payment record for this order
    let payment = await this.prismaService.payment.findUnique({
      where: { order_id: orderId },
    });

    if (!payment) {
      // Get order to find amount
      const order = await this.prismaService.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      payment = await this.createPayment(orderId, order.total.toNumber(), PaymentMethod.CASH);
    }

    // Calculate change
    const changeGiven = new Decimal(amountReceived).minus(payment.amount).toNumber();

    // Update payment status to COMPLETED
    const updatedPayment = await this.prismaService.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        amount_received: new Decimal(amountReceived),
        change_given: new Decimal(Math.max(0, changeGiven)),
        confirmed_by: confirmedBy,
        confirmed_at: new Date(),
      },
    });

    return updatedPayment;
  }

  // Get payment by ID
  async getPaymentById(paymentId: string) {
    const payment = await this.prismaService.payment.findUnique({
      where: { id: paymentId },
    });

    return payment;
  }

  // Get payment by order ID
  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prismaService.payment.findUnique({
      where: { order_id: orderId },
    });

    return payment;
  }

  // List payments (pagination)
  async listPayments(limit: number = 50, offset: number = 0) {
    const payments = await this.prismaService.payment.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prismaService.payment.count({});

    return { payments, total };
  }

  // Get payment stats for a date range (for analytics)
  async getPaymentStats(startDate: Date, endDate: Date) {
    const payments = await this.prismaService.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalRevenue = new Decimal(0);
    payments.forEach((p: any) => {
      totalRevenue = totalRevenue.plus(new Decimal(p.amount.toString()));
    });

    const paymentsByMethod = {
      [PaymentMethod.RAZORPAY]: payments.filter((p: any) => p.payment_method === PaymentMethod.RAZORPAY)
        .length,
      [PaymentMethod.CASH]: payments.filter((p: any) => p.payment_method === PaymentMethod.CASH).length,
    };

    return {
      total_payments: payments.length,
      total_revenue: totalRevenue.toNumber(),
      payments_by_method: paymentsByMethod,
    };
  }
}
