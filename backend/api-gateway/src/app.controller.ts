import { Controller, Get, Inject } from '@nestjs/common';
import { ServiceRouter } from './gateway/service-router';

@Controller()
export class AppController {
  constructor(private readonly serviceRouter: ServiceRouter) {}

  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/services/health')
  async servicesHealth() {
    const status = await this.serviceRouter.getServicesStatus();
    const allHealthy = Object.values(status).every((s) => s.healthy);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      gateway: 'healthy',
      services: status,
      timestamp: new Date().toISOString(),
    };
  }
}
