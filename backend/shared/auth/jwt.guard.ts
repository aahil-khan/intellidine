import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtUtils } from './jwt.utils';

/**
 * JWT Guard - Validates Bearer token from Authorization header
 * Used across all services to protect endpoints
 */
@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('No authorization header provided');
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = JwtUtils.extractTokenFromHeader(authHeader);
    if (!token) {
      this.logger.warn('Invalid authorization header format');
      throw new UnauthorizedException('Invalid authorization header format. Expected: Bearer <token>');
    }

    try {
      const payload = JwtUtils.verifyToken(token);
      request.user = payload;
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`JWT verification failed: ${errorMessage}`);
      throw new UnauthorizedException(`JWT verification failed: ${errorMessage}`);
    }
  }
}
