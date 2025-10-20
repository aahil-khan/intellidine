import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Generate correlation ID for request tracing
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Attach to request
    (req as any).correlationId = correlationId;
    (req as any).startTime = Date.now();

    // Add correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-processed-by', 'api-gateway');
    res.setHeader('x-processing-time', '0');

    // Intercept res.end to calculate processing time
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = Date.now() - (req as any).startTime;
      res.setHeader('x-processing-time', duration.toString());
      return originalEnd.apply(res, args);
    };

    this.logger.debug(`Request: ${req.method} ${req.path} [${correlationId}]`);
    next();
  }
}
