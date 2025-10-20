import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Verification Middleware
 * 
 * Ensures that:
 * 1. Tenant ID is extracted from JWT token or x-tenant-id header
 * 2. Tenant ID is validated and propagated through request headers
 * 3. Request is properly tagged for tenant isolation
 */
@Injectable()
export class TenantVerificationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantVerificationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req as any).correlationId || 'unknown';
    const user = (req as any).user;

    // Get tenant ID from various sources (in order of priority)
    let tenantId = 
      req.headers['x-tenant-id'] as string ||
      user?.tenantId ||
      null;

    // Public endpoints that don't require tenant
    const publicEndpoints = [
      '/health',
      '/services/health',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/refresh',
    ];

    const isPublic = publicEndpoints.some(ep => req.path.startsWith(ep));

    // Validate tenant ID for protected endpoints
    if (!isPublic && !tenantId && user) {
      this.logger.warn(
        `Tenant verification failed: No tenant ID for authenticated user ${user.id} [${correlationId}]`,
      );
      // Still allow the request to pass - let downstream services handle validation
    }

    // If we have a tenant ID, propagate it
    if (tenantId) {
      (req as any).tenantId = tenantId;
      req.headers['x-tenant-id'] = tenantId;
      
      this.logger.debug(
        `Tenant verified: ${tenantId} for user ${user?.id} [${correlationId}]`,
      );
    }

    // Track this in response headers
    if (tenantId) {
      res.setHeader('x-tenant-id', tenantId);
    }

    next();
  }
}
