import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { JwtGuard } from '../guards/jwt.guard';
import { RolesGuard } from '../guards/roles.guard';

/**
 * Shared Auth Module
 * 
 * Provides:
 * - AuthMiddleware: Global JWT validation
 * - JwtGuard: Route-level JWT protection
 * - RolesGuard: Role-based access control
 * - JwtModule: Token generation and verification
 * 
 * Usage in other services:
 * 1. Import SharedAuthModule in their app.module.ts
 * 2. Apply middleware in configure() method
 * 3. Use @UseGuards(JwtGuard) on controllers
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthMiddleware, JwtGuard, RolesGuard],
  exports: [AuthMiddleware, JwtGuard, RolesGuard, JwtModule],
})
export class SharedAuthModule {}
