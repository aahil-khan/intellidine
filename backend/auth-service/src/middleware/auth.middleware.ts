import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

/**
 * Global Auth Middleware
 * - Validates JWT tokens from Authorization header
 * - Extracts and attaches user info to request object
 * - Allows public endpoints to bypass validation
 * - Used across all services for tenant validation
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AuthMiddleware');

  constructor(private readonly jwtService: JwtService) {}

  // Endpoints that don't require authentication
  private readonly publicEndpoints = [
    '/health',
    '/api/auth/customer/request-otp',
    '/api/auth/customer/verify-otp',
    '/api/auth/staff/login',
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // Check if route is public
    if (this.isPublicEndpoint(req.path)) {
      return next();
    }

    // Extract tenant_id from query params or body
    const tenantId = req.query.tenant_id as string;
    if (!tenantId) {
      this.logger.warn(`Missing tenant_id for protected route: ${req.path}`);
      throw new UnauthorizedException('tenant_id query parameter is required');
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Missing or invalid Authorization header for ${req.path}`);
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      // Attach user info and tenant_id to request
      (req as any).user = {
        id: payload.userId || payload.sub,
        phone_number: payload.phone_number,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        tenant_id: payload.tenant_id,
      };

      // Validate tenant_id matches
      if (payload.tenant_id && payload.tenant_id !== tenantId) {
        this.logger.warn(
          `Tenant mismatch: token has ${payload.tenant_id}, request has ${tenantId}`
        );
        throw new UnauthorizedException('Tenant ID mismatch');
      }

      // Attach tenant_id for consistency
      (req as any).tenant_id = tenantId;

      this.logger.debug(`✓ Auth successful for user ${payload.userId} (tenant: ${tenantId})`);
      next();
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Check if endpoint should bypass authentication
   */
  private isPublicEndpoint(path: string): boolean {
    return this.publicEndpoints.some((endpoint) =>
      path.startsWith(endpoint)
    );
  }
}

/**
 * Extend Express Request to include user and tenant_id
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone_number?: string;
        username?: string;
        email?: string;
        role?: string;
        tenant_id?: string;
      };
      tenant_id?: string;
    }
  }
}
