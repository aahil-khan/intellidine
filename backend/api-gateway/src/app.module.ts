import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway/gateway.controller';
import { ServiceRouter } from './gateway/service-router';
import { PrismaService } from './prisma.service';
import { AuthMiddleware } from './middleware/auth.middleware';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { TenantVerificationMiddleware } from './middleware/tenant-verification.middleware';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { AppController } from './app.controller';

@Module({
  imports: [HttpModule],
  controllers: [GatewayController, AppController],
  providers: [ServiceRouter, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes('*')
      .apply(AuthMiddleware)
      .forRoutes('*')
      .apply(TenantVerificationMiddleware)
      .forRoutes('*')
      .apply(ErrorHandlerMiddleware)
      .forRoutes('*');
  }
}

