import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

/**
 * Shared JWT Service
 * Used across all services for token verification and generation
 * 
 * Usage:
 * - Verify tokens: jwtService.verify(token)
 * - Generate tokens: jwtService.sign(payload)
 * 
 * @deprecated Use JwtUtils from @shared/auth instead
 */
@Injectable()
export class SharedJwtService {
  private readonly logger = new Logger('SharedJwtService');
  private readonly secret = process.env.JWT_SECRET || 'your-secret-key';

  /**
   * Verify and decode JWT token
   */
  verify(token: string): any {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as any;
      this.logger.debug(`✓ Token verified for user: ${decoded.userId || decoded.sub}`);
      return decoded;
    } catch (error: any) {
      this.logger.error(`✗ Token verification failed: ${error.message}`);
      throw new BadRequestException(`Invalid or expired token: ${error.message}`);
    }
  }

  /**
   * Sign and generate new JWT token
   */
  sign(payload: any, expiresIn: string = '24h'): string {
    try {
      const token = jwt.sign(payload, this.secret as string, {
        algorithm: 'HS256' as const,
        expiresIn,
      } as any);
      this.logger.debug(`✓ Token generated for user: ${payload.userId || payload.sub}`);
      return token;
    } catch (error: any) {
      this.logger.error(`✗ Token generation failed: ${error.message}`);
      throw new BadRequestException(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decode(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error: any) {
      this.logger.error(`✗ Token decode failed: ${error.message}`);
      throw new BadRequestException(`Invalid token format: ${error.message}`);
    }
  }
}
