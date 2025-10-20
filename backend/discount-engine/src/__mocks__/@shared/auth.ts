export class JwtGuard {
  canActivate() { return true; }
}
export class TenantGuard {
  canActivate() { return true; }
}
export class RolesGuard {
  canActivate() { return true; }
}
export const RequireRole = (roles: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor;
};
export const CurrentUser = (target: any, propertyKey: string, parameterIndex: number) => parameterIndex;
