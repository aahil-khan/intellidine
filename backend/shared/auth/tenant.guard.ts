import { Injectable, CanActivate, ExecutionContext, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtUtils, JwtPayload } from './jwt.utils';

/**
 * Tenant Guard - Validates tenant_id matches JWT payload
 * Ensures multi-tenant isolation
 * Must be used alongside JwtGuard
 * 
 * Multi-tenant flow:
 * 1. Customer scans QR code at table → QR URL contains tenant_id in path (e.g., /order/tenant/abc-123)
 * 2. Frontend extracts tenant_id from URL, stores in session
 * 3. Customer gets JWT via OTP (no tenant_id in token for customers)
 * 4. Frontend includes tenant_id in all requests: ?tenant_id=abc-123 or { tenant_id: "abc-123" }
 * 
 * 5. Staff login → JWT token includes tenant_id automatically
 * 6. Staff can omit tenant_id in requests (extracted from token)
 * 
 * Behavior:
 * - Extract tenant_id from: query param → body → JWT token (staff only)
 * - Validate consistency: if JWT has tenant_id, request tenant_id must match
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    
    // Try to get tenant_id from query params, body, or JWT token
    let tenantId = request.query.tenant_id || request.body?.tenant_id || user?.tenant_id;

    if (!tenantId) {
      this.logger.warn(
        `Missing tenant_id for user ${user?.sub}. ` +
        `Pass in query (?tenant_id=X), body ({ tenant_id: X }), or ensure JWT contains tenant_id (staff users)`
      );
      throw new BadRequestException(
        'tenant_id is required. For customers: pass in query (?tenant_id=X) or body. For staff: should be in JWT token.'
      );
    }

    // Store tenant_id in request for downstream use
    request.tenant_id = tenantId;

    // Validate tenant_id consistency
    // If user has tenant_id in token (staff), it must match request tenant_id (if provided)
    if (user?.tenant_id && user.tenant_id !== tenantId) {
      this.logger.warn(
        `Tenant mismatch for user ${user.sub}: token=${user.tenant_id}, request=${tenantId}`
      );
      throw new UnauthorizedException('Tenant ID mismatch. Access denied.');
    }

    return true;
  }
}
