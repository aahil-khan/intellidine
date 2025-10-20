import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private redis: RedisClientType;
  private prisma: PrismaClient;

  constructor() {
    this.redis = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
    this.redis.connect().catch((err) => {
      this.logger.error('Failed to connect to Redis:', err);
    });
    this.prisma = new PrismaClient();
  }

  /**
   * Generate and store OTP for a phone number
   * OTP expires in 5 minutes
   */
  async requestOtp(phone: string): Promise<{ message: string; expires_at: string }> {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      // In development, use 1 hour TTL for testing; in production use 5 minutes
      const ttlSeconds = process.env.NODE_ENV === 'production' ? 300 : 3600;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      // Store OTP in Redis with configurable TTL
      const redisKey = `otp:${phone}`;
      await this.redis.setEx(redisKey, ttlSeconds, JSON.stringify({ otpHash, expiresAt: expiresAt.toISOString() }));

      // Store in database for audit trail
      await this.prisma.otpVerification.create({
        data: {
          phone_number: phone,
          otp_hash: otpHash,
          expires_at: expiresAt,
        },
      });

      // In production, send OTP via SMS (MSG91)
      // For now, log to console
      this.logger.log(`OTP for ${phone}: ${otp}`);

      return {
        message: 'OTP sent successfully',
        expires_at: expiresAt.toISOString(),
        // Return OTP only in development for testing
        ...(process.env.NODE_ENV !== 'production' && { otp }),
      };
    } catch (error) {
      this.logger.error(`Error requesting OTP for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Verify OTP and create/get customer
   */
  async verifyOtp(phone: string, otp: string): Promise<{ customerId: string; isNewCustomer: boolean }> {
    try {
      // Get OTP from Redis
      const redisKey = `otp:${phone}`;
      const storedData = await this.redis.get(redisKey);

      if (!storedData) {
        throw new Error('OTP expired or not found');
      }

      const { otpHash, expiresAt } = JSON.parse(storedData);

      // Check if OTP has expired
      if (new Date() > new Date(expiresAt)) {
        await this.redis.del(redisKey);
        throw new Error('OTP has expired');
      }

      // Verify OTP against hash
      const isValid = await bcrypt.compare(otp, otpHash);
      if (!isValid) {
        throw new Error('Invalid OTP');
      }

      // Mark OTP as verified in database
      await this.prisma.otpVerification.updateMany({
        where: { phone_number: phone },
        data: { verified: true },
      });

      // Delete OTP from Redis
      await this.redis.del(redisKey);

      // Create or get customer
      let customer = await this.prisma.customer.findUnique({
        where: { phone_number: phone },
      });

      const isNewCustomer = !customer;

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            phone_number: phone,
          },
        });
      }

      return {
        customerId: customer.id,
        isNewCustomer,
      };
    } catch (error) {
      this.logger.error(`Error verifying OTP for ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Hash password for staff login
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password for staff login
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Create session token in Redis
   */
  async createSession(userId: string, token: string, expiresIn: number = 86400): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.redis.setEx(sessionKey, expiresIn, token);
  }

  /**
   * Verify session token
   */
  async verifySession(userId: string, token: string): Promise<boolean> {
    const sessionKey = `session:${userId}`;
    const storedToken = await this.redis.get(sessionKey);
    return storedToken === token;
  }

  /**
   * Invalidate session
   */
  async invalidateSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.redis.del(sessionKey);
  }
}
