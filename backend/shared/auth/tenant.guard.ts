import { Injectable, CanActivate, ExecutionContext, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtUtils, JwtPayload } from './jwt.utils';

/**
 * Tenant Guard - Validates tenant_id matches JWT payload
 * Ensures multi-tenant isolation
 * Must be used alongside JwtGuard
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    
    // tenant_id can come from query params or body
    let tenantId = request.query.tenant_id || request.body?.tenant_id;

    if (!tenantId) {
      this.logger.warn(`Missing tenant_id for user ${user?.sub}`);
      throw new BadRequestException('tenant_id is required (query param or body)');
    }

    // Store tenant_id in request for downstream use
    request.tenant_id = tenantId;

    // Note: Customer users don't have tenant_id in token, so we allow any tenant_id
    // Staff users have tenant_id in token, so we should validate it matches
    if (user?.tenant_id && user.tenant_id !== tenantId) {
      this.logger.warn(
        `Tenant mismatch for user ${user.sub}: token=${user.tenant_id}, request=${tenantId}`
      );
      throw new UnauthorizedException('Tenant ID mismatch. Access denied.');
    }

    return true;
  }
}
