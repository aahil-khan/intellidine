import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string; // user ID
  type: 'customer' | 'staff'; // user type
  iat: number;
  exp: number;
}

export class JwtUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
  private static readonly JWT_EXPIRES_IN = '24h';

  /**
   * Generate JWT token for a user
   */
  static generateToken(userId: string, type: 'customer' | 'staff'): { token: string; expiresAt: string } {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      type,
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    // Calculate expiration time
    const decoded = jwt.decode(token) as any;
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    return { token, expiresAt };
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract bearer token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    return parts[1];
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
