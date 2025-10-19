import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from './jwt.utils';

/**
 * Roles Guard - Validates user has required role
 * Works with @RequireRole('staff') decorator
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is staff (only staff can have roles)
    if (user.type !== 'staff') {
      this.logger.warn(`User ${user.sub} does not have staff role`);
      throw new ForbiddenException('Access denied. Staff role required.');
    }

    return true;
  }
}
