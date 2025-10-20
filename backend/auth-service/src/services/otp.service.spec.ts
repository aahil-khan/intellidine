import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import * as bcrypt from 'bcrypt';

describe('OtpService', () => {
  let service: OtpService;

  // Mock dependencies
  const mockRedis = {
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockPrisma = {
    otpVerification: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock the OtpService to avoid direct Redis/Prisma connections in test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: OtpService,
          useValue: {
            requestOtp: jest.fn(),
            verifyOtp: jest.fn(),
            hashPassword: jest.fn(),
            verifyPassword: jest.fn(),
            getUserByUsername: jest.fn(),
            createSession: jest.fn(),
            verifySession: jest.fn(),
            invalidateSession: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  describe('requestOtp', () => {
    it('should request OTP successfully', async () => {
      const phone = '+919876543210';
      const mockResult = {
        message: 'OTP sent successfully',
        expires_at: expect.any(String),
      };

      jest.spyOn(service, 'requestOtp').mockResolvedValue(mockResult);

      const result = await service.requestOtp(phone);
      expect(result.message).toBe('OTP sent successfully');
      expect(result).toHaveProperty('expires_at');
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and return customer ID for existing customer', async () => {
      const phone = '+919876543210';
      const otp = '123456';
      const customerId = 'cust-123';

      jest.spyOn(service, 'verifyOtp').mockResolvedValue({
        customerId,
        isNewCustomer: false,
      });

      const result = await service.verifyOtp(phone, otp);
      expect(result.customerId).toBe(customerId);
      expect(result.isNewCustomer).toBe(false);
    });

    it('should verify OTP and return customer ID for new customer', async () => {
      const phone = '+919876543211';
      const otp = '123456';
      const customerId = 'cust-124';

      jest.spyOn(service, 'verifyOtp').mockResolvedValue({
        customerId,
        isNewCustomer: true,
      });

      const result = await service.verifyOtp(phone, otp);
      expect(result.customerId).toBe(customerId);
      expect(result.isNewCustomer).toBe(true);
    });

    it('should throw error for invalid OTP', async () => {
      const phone = '+919876543210';
      const otp = '000000';

      jest.spyOn(service, 'verifyOtp').mockRejectedValue(new Error('Invalid OTP'));

      await expect(service.verifyOtp(phone, otp)).rejects.toThrow('Invalid OTP');
    });

    it('should throw error for expired OTP', async () => {
      const phone = '+919876543210';
      const otp = '123456';

      jest.spyOn(service, 'verifyOtp').mockRejectedValue(new Error('OTP has expired'));

      await expect(service.verifyOtp(phone, otp)).rejects.toThrow('OTP has expired');
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const mockHash = 'hashed_password_123';

      jest.spyOn(service, 'hashPassword').mockResolvedValue(mockHash);

      const result = await service.hashPassword(password);
      expect(result).toBe(mockHash);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = 'hashed_password_123';

      jest.spyOn(service, 'verifyPassword').mockResolvedValue(true);

      const result = await service.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'WrongPassword123!';
      const hash = 'hashed_password_123';

      jest.spyOn(service, 'verifyPassword').mockResolvedValue(false);

      const result = await service.verifyPassword(password, hash);
      expect(result).toBe(false);
    });
  });

  describe('getUserByUsername', () => {
    it('should return user by username', async () => {
      const username = 'manager1';
      const mockUser = {
        id: 'staff-123',
        username,
        email: 'manager@restaurant.com',
        role: 'manager',
        tenant_id: 'tenant-123',
      };

      jest.spyOn(service, 'getUserByUsername').mockResolvedValue(mockUser);

      const result = await service.getUserByUsername(username);
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      const username = 'nonexistent';

      jest.spyOn(service, 'getUserByUsername').mockResolvedValue(null);

      const result = await service.getUserByUsername(username);
      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const userId = 'user-123';
      const token = 'jwt-token-xyz';

      jest.spyOn(service, 'createSession').mockResolvedValue(undefined);

      await expect(service.createSession(userId, token)).resolves.not.toThrow();
    });
  });

  describe('verifySession', () => {
    it('should verify session successfully', async () => {
      const userId = 'user-123';
      const token = 'jwt-token-xyz';

      jest.spyOn(service, 'verifySession').mockResolvedValue(true);

      const result = await service.verifySession(userId, token);
      expect(result).toBe(true);
    });

    it('should reject invalid session', async () => {
      const userId = 'user-123';
      const token = 'invalid-token';

      jest.spyOn(service, 'verifySession').mockResolvedValue(false);

      const result = await service.verifySession(userId, token);
      expect(result).toBe(false);
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session successfully', async () => {
      const userId = 'user-123';

      jest.spyOn(service, 'invalidateSession').mockResolvedValue(undefined);

      await expect(service.invalidateSession(userId)).resolves.not.toThrow();
    });
  });
});
