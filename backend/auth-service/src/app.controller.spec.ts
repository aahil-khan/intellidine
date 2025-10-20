import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AppController } from './app.controller';
import { OtpService } from './services/otp.service';

describe('AppController (Auth Service)', () => {
  let controller: AppController;
  let otpService: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: OtpService,
          useValue: {
            requestOtp: jest.fn(),
            verifyOtp: jest.fn(),
            getUserByUsername: jest.fn(),
            verifyPassword: jest.fn(),
            createSession: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    otpService = module.get<OtpService>(OtpService);
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = controller.health();
      expect(result).toEqual({
        status: 'ok',
        service: 'auth-service',
      });
    });
  });

  describe('requestOtp', () => {
    it('should request OTP successfully', async () => {
      const phone = '+919876543210';
      const mockResult = {
        message: 'OTP sent',
        expires_at: new Date().toISOString(),
      };

      jest.spyOn(otpService, 'requestOtp').mockResolvedValue(mockResult);

      const result = await controller.requestOtp({ phone });
      expect(result).toEqual(mockResult);
      expect(otpService.requestOtp).toHaveBeenCalledWith(phone);
    });

    it('should throw BadRequestException on OTP request failure', async () => {
      const phone = '+919876543210';
      jest.spyOn(otpService, 'requestOtp').mockRejectedValue(new Error('SMS service error'));

      await expect(controller.requestOtp({ phone })).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and return JWT token', async () => {
      const phone = '+919876543210';
      const otp = '123456';
      const customerId = 'cust-123';

      jest.spyOn(otpService, 'verifyOtp').mockResolvedValue({
        customerId,
        isNewCustomer: false,
      });
      jest.spyOn(otpService, 'createSession').mockResolvedValue(undefined);

      const result = await controller.verifyOtp({ phone, otp });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_at');
      expect(result.user).toEqual({
        id: customerId,
        phone_number: phone,
      });
      expect(otpService.verifyOtp).toHaveBeenCalledWith(phone, otp);
    });

    it('should throw UnauthorizedException on invalid OTP', async () => {
      const phone = '+919876543210';
      const otp = 'invalid';

      jest.spyOn(otpService, 'verifyOtp').mockRejectedValue(new UnauthorizedException('Invalid OTP'));

      await expect(controller.verifyOtp({ phone, otp })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login (Staff)', () => {
    it('should login staff successfully', async () => {
      const username = 'manager1';
      const password = 'password123';
      const mockUser = {
        id: 'staff-123',
        username,
        email: 'manager@restaurant.com',
        role: 'manager',
        tenant_id: 'tenant-123',
        password_hash: 'hashed_password',
      };

      jest.spyOn(otpService, 'getUserByUsername').mockResolvedValue(mockUser);
      jest.spyOn(otpService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(otpService, 'createSession').mockResolvedValue(undefined);

      const result = await controller.login({ username, password });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_at');
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        tenant_id: mockUser.tenant_id,
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const username = 'nonexistent';
      const password = 'wrong';

      jest.spyOn(otpService, 'getUserByUsername').mockResolvedValue(null);

      await expect(controller.login({ username, password })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const username = 'manager1';
      const password = 'wrong_password';
      const mockUser = {
        id: 'staff-123',
        username,
        password_hash: 'hashed_password',
      };

      jest.spyOn(otpService, 'getUserByUsername').mockResolvedValue(mockUser);
      jest.spyOn(otpService, 'verifyPassword').mockResolvedValue(false);

      await expect(controller.login({ username, password })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException on unexpected error', async () => {
      const username = 'manager1';
      const password = 'password123';

      jest.spyOn(otpService, 'getUserByUsername').mockRejectedValue(new Error('Database error'));

      await expect(controller.login({ username, password })).rejects.toThrow(BadRequestException);
    });
  });
});
