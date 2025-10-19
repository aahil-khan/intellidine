import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: RedisClientType;
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor() {
    this.redis = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
    this.redis.connect().catch((err) => {
      this.logger.error('Failed to connect to Redis:', err);
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await this.redis.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Invalidate all menu caches for a tenant
   */
  async invalidateMenuCache(tenantId: string): Promise<void> {
    await this.deleteByPattern(`menu:${tenantId}:*`);
    this.logger.log(`Menu cache invalidated for tenant: ${tenantId}`);
  }

  /**
   * Generate cache key for menu
   */
  static generateMenuKey(tenantId: string, filters?: Record<string, any>): string {
    const filterKey = filters && Object.keys(filters).length > 0 
      ? `:${JSON.stringify(filters).split('').reduce((a: any, b) => a + b.charCodeAt(0), 0)}`
      : '';
    return `menu:${tenantId}${filterKey}`;
  }

  /**
   * Generate cache key for single item
   */
  static generateItemKey(itemId: string): string {
    return `menu_item:${itemId}`;
  }

  /**
   * Generate cache key for categories
   */
  static generateCategoriesKey(tenantId: string): string {
    return `menu:${tenantId}:categories`;
  }
}
