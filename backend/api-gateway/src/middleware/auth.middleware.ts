import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        // Public endpoints - continue without auth
        (req as any).user = null;
        (req as any).tenantId = null;
        return next();
      }

      const token = authHeader.replace('Bearer ', '');
      const secret = process.env.JWT_SECRET || 'dev-secret-key';

      const decoded = jwt.verify(token, secret) as any;

      // Attach user context to request
      (req as any).user = {
        id: decoded.sub,
        type: decoded.type,
        tenantId: decoded.tenant_id,
      };
      (req as any).tenantId = decoded.tenant_id;
      (req as any).userId = decoded.sub;
      (req as any).userType = decoded.type;

      this.logger.debug(
        `Auth middleware: user=${decoded.sub}, tenant=${decoded.tenant_id}`,
      );
    } catch (error) {
      this.logger.warn(`JWT validation failed: ${error.message}`);
      (req as any).user = null;
      (req as any).tenantId = null;
    }

    next();
  }
}
