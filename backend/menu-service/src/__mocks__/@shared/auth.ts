/**
 * Mock @shared/auth module for testing
 */

export class JwtGuard {
  canActivate() {
    return true;
  }
}

export class TenantGuard {
  canActivate() {
    return true;
  }
}

export class RolesGuard {
  canActivate() {
    return true;
  }
}

// RequireRole is a decorator function, not a class
export const RequireRole = (roles: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
};

// CurrentUser is also a decorator
export const CurrentUser = (target: any, propertyKey: string, parameterIndex: number) => {
  return parameterIndex;
};

export const SharedAuthModule = {
  register: () => ({
    module: SharedAuthModule,
  }),
};
