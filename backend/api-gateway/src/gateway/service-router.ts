import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface ServiceConfig {
  host: string;
  port: number;
  baseUrl?: string;
  name: string;
}

@Injectable()
export class ServiceRouter {
  private readonly logger = new Logger(ServiceRouter.name);
  private services: Record<string, ServiceConfig> = {
    auth: {
      name: 'auth-service',
      host: process.env.AUTH_SERVICE_HOST || 'auth-service',
      port: 3001,
    },
    menu: {
      name: 'menu-service',
      host: process.env.MENU_SERVICE_HOST || 'menu-service',
      port: 3003,
    },
    orders: {
      name: 'order-service',
      host: process.env.ORDER_SERVICE_HOST || 'order-service',
      port: 3002,
    },
    inventory: {
      name: 'inventory-service',
      host: process.env.INVENTORY_SERVICE_HOST || 'inventory-service',
      port: 3004,
    },
    payments: {
      name: 'payment-service',
      host: process.env.PAYMENT_SERVICE_HOST || 'payment-service',
      port: 3005,
    },
    notifications: {
      name: 'notification-service',
      host: process.env.NOTIFICATION_SERVICE_HOST || 'notification-service',
      port: 3006,
    },
  };

  constructor(private readonly httpService: HttpService) {
    // Set base URLs for each service
    Object.keys(this.services).forEach((key) => {
      this.services[key].baseUrl = `http://${this.services[key].host}:${this.services[key].port}`;
    });

    this.logger.log('Service Router initialized with services:', this.services);
  }

  /**
   * Route request to appropriate service based on path
   */
  getServiceUrl(path: string): ServiceConfig | null {
    // Remove /api prefix if present (since controller is mounted at /api)
    let cleanPath = path.replace(/^\/api/, '');
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    const parts = cleanPath.split('/').filter(Boolean);
    const servicePrefix = parts[0]; // {service}/...

    switch (servicePrefix) {
      case 'auth':
        return this.services.auth;
      case 'menu':
        return this.services.menu;
      case 'orders':
        return this.services.orders;
      case 'inventory':
        return this.services.inventory;
      case 'payments':
        return this.services.payments;
      case 'notifications':
        return this.services.notifications;
      default:
        return null;
    }
  }

  /**
   * Forward request to service and get response
   */
  async forwardRequest(
    method: string,
    path: string,
    headers: any,
    body?: any,
    query?: any,
  ) {
    const service = this.getServiceUrl(path);
    if (!service) {
      throw new HttpException(
        `Service not found for path: ${path}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Construct forward path - ensure /api prefix
    let forwardPath = path.replace(/^\/api/, '');
    if (!forwardPath.startsWith('/')) {
      forwardPath = '/' + forwardPath;
    }
    if (!forwardPath.startsWith('/api')) {
      forwardPath = '/api' + forwardPath;
    }

    const url = `${service.baseUrl}${forwardPath}`;

    try {
      this.logger.log(
        `Forwarding ${method} request to ${service.name}: ${forwardPath}`,
      );

      const config = {
        headers: this.filterHeaders(headers),
        params: query,
      };

      let response: any;

      switch (method.toUpperCase()) {
        case 'GET':
          response = await firstValueFrom(
            this.httpService.get(url, config),
          );
          break;
        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(url, body, config),
          );
          break;
        case 'PUT':
          response = await firstValueFrom(
            this.httpService.put(url, body, config),
          );
          break;
        case 'PATCH':
          response = await firstValueFrom(
            this.httpService.patch(url, body, config),
          );
          break;
        case 'DELETE':
          response = await firstValueFrom(
            this.httpService.delete(url, config),
          );
          break;
        default:
          throw new HttpException(
            `Unsupported method: ${method}`,
            HttpStatus.METHOD_NOT_ALLOWED,
          );
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error forwarding request to ${service.name}: ${error.message}`,
      );

      if (error.response?.status) {
        throw new HttpException(
          error.response.data || { error: 'Service error' },
          error.response.status,
        );
      }

      throw new HttpException(
        'Service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Filter headers to remove sensitive/hop-by-hop headers
   */
  private filterHeaders(headers: any): any {
    const allowedHeaders = [
      'authorization',
      'content-type',
      'accept',
      'user-agent',
      'x-correlation-id',
      'x-tenant-id',
      'x-user-id',
    ];

    const filtered: any = {};
    Object.keys(headers).forEach((key) => {
      if (allowedHeaders.includes(key.toLowerCase())) {
        filtered[key] = headers[key];
      }
    });

    return filtered;
  }

  /**
   * Get service health
   */
  async checkServiceHealth(serviceKey: string): Promise<boolean> {
    const service = this.services[serviceKey];
    if (!service) return false;

    try {
      await firstValueFrom(
        this.httpService.get(`${service.baseUrl}/health`, {
          timeout: 5000,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all services health status
   */
  async getServicesStatus() {
    const status: Record<string, { healthy: boolean; url: string }> = {};

    for (const [key, service] of Object.entries(this.services)) {
      const healthy = await this.checkServiceHealth(key);
      status[key] = {
        healthy,
        url: service.baseUrl,
      };
    }

    return status;
  }
}
