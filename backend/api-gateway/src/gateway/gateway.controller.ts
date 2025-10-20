import {
  All,
  Controller,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ServiceRouter } from './service-router';

@Controller('/api')
export class GatewayController {
  constructor(private readonly serviceRouter: ServiceRouter) {}

  @All('*')
  async handleRequest(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const method = req.method;
      const path = req.path;

      // Skip health check endpoint
      if (path === '/health') {
        return res.json({ status: 'ok', service: 'api-gateway' });
      }

      // Forward request to appropriate service
      const result = await this.serviceRouter.forwardRequest(
        method,
        path,
        req.headers,
        req.body,
        req.query,
      );

      res.json(result);
    } catch (error: any) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorResponse = {
        statusCode,
        error: error.name || 'Error',
        message: error.message || 'An error occurred',
        correlationId: (req as any).correlationId || 'unknown',
        timestamp: new Date().toISOString(),
        path: req.path,
      };

      res.status(statusCode).json(errorResponse);
    }
  }
}
