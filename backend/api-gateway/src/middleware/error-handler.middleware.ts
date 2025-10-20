import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Error Handler Middleware
 * 
 * Standardizes all responses (success and error) with:
 * - Consistent status codes
 * - Correlation IDs for request tracing
 * - Tenant awareness
 * - Timestamps and metadata
 */
@Injectable()
export class ErrorHandlerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorHandlerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Wrap the response.json to handle errors
    const originalJson = res.json;
    const logger = this.logger;
    const correlationId = (req as any).correlationId || 'unknown';
    const tenantId = (req as any).tenantId;

    res.json = function (data: any) {
      // If response is an error from upstream service
      if (data?.error || (data?.statusCode && data?.statusCode >= 400)) {
        const error = data?.error || 'Unknown error';

        // Log the error with tenant context
        logger.warn(
          `Error response from upstream: ${error} [${correlationId}] ${
            tenantId ? `[tenant: ${tenantId}]` : ''
          }`,
        );

        // Standardize error response
        const standardizedError = {
          statusCode: data?.statusCode || 500,
          error: data?.error || 'Internal Server Error',
          message: data?.message || error,
          correlationId,
          ...(tenantId && { tenantId }),
          timestamp: new Date().toISOString(),
          path: req.path,
        };

        return originalJson.call(this, standardizedError);
      }

      // Success response - add standard metadata
      const response = {
        data,
        meta: {
          timestamp: new Date().toISOString(),
          correlationId,
          ...(tenantId && { tenantId }),
        },
      };

      return originalJson.call(this, response);
    };

    next();
  }
}

