import { SetMetadata } from '@nestjs/common';

/**
 * @RequireRole decorator - Marks endpoint as requiring specific roles
 * Usage: @RequireRole(['staff'])
 * Must be used with @UseGuards(RolesGuard, JwtGuard)
 */
export const RequireRole = (roles: string[]) => SetMetadata('roles', roles);
