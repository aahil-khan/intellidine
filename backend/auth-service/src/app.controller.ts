import { Controller, Get, Post, Body, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { OtpService } from './services/otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtUtils } from './utils/jwt.utils';

@Controller('api/auth')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private otpService: OtpService) {}

  @Get('/health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }

  /**
   * Request OTP for customer
   * POST /api/auth/customer/request-otp
   * Body: { phone: "+919876543210" }
   * Response: { message: "OTP sent", expires_at: "2025-10-18T10:35:00Z" }
   */
  @Post('/customer/request-otp')
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    try {
      const result = await this.otpService.requestOtp(requestOtpDto.phone);
      return result;
    } catch (error) {
      this.logger.error(`Error requesting OTP:`, error);
      throw new BadRequestException('Failed to request OTP');
    }
  }

  /**
   * Verify OTP and get JWT token for customer
   * POST /api/auth/customer/verify-otp
   * Body: { phone: "+919876543210", otp: "123456" }
   * Response: { access_token: "eyJhbGc...", expires_at: "...", user: {...} }
   */
  @Post('/customer/verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    try {
      const { customerId, isNewCustomer } = await this.otpService.verifyOtp(verifyOtpDto.phone, verifyOtpDto.otp);

      // Generate JWT token
      const { token, expiresAt } = JwtUtils.generateToken(customerId, 'customer');

      // Create session in Redis
      await this.otpService.createSession(customerId, token);

      return {
        access_token: token,
        expires_at: expiresAt,
        user: {
          id: customerId,
          phone_number: verifyOtpDto.phone,
        },
      };
    } catch (error) {
      this.logger.error(`Error verifying OTP:`, error);
      throw new UnauthorizedException(error instanceof Error ? error.message : 'Failed to verify OTP');
    }
  }

  /**
   * Staff login with username and password
   * POST /api/auth/staff/login
   * Body: { username: "manager1", password: "password123" }
   * Response: { access_token: "eyJhbGc...", expires_at: "...", user: {...} }
   */
  @Post('/staff/login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    try {
      const user = await this.otpService.getUserByUsername(loginDto.username);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await this.otpService.verifyPassword(loginDto.password, user.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token
      const { token, expiresAt } = JwtUtils.generateToken(user.id, 'staff');

      // Create session in Redis
      await this.otpService.createSession(user.id, token);

      return {
        access_token: token,
        expires_at: expiresAt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id || undefined,
        },
      };
    } catch (error) {
      this.logger.error(`Error during staff login:`, error);
      throw error instanceof UnauthorizedException
        ? error
        : new BadRequestException('Login failed');
    }
  }
}

