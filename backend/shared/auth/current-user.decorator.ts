import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './jwt.utils';

/**
 * @CurrentUser decorator - Extracts user from request
 * Usage: async someMethod(@CurrentUser() user: JwtPayload)
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as JwtPayload;
});
