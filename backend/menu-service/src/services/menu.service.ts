import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CacheService } from './cache.service';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { MenuResponseDto, CategoryWithItemsDto, MenuItemResponseDto } from '../dto/menu-response.dto';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);
  private prisma: PrismaClient;

  constructor(private cacheService: CacheService) {
    this.prisma = new PrismaClient();
  }

  /**
   * Get complete menu for a tenant (organized by categories)
   */
  async getMenu(tenantId: string, categoryId?: string): Promise<MenuResponseDto> {
    // Generate cache key
    const cacheKey = CacheService.generateMenuKey(tenantId, { categoryId });

    // Try to get from cache
    const cachedMenu = await this.cacheService.get<MenuResponseDto>(cacheKey);
    if (cachedMenu) {
      this.logger.log(`Menu retrieved from cache for tenant: ${tenantId}`);
      return cachedMenu;
    }

    // Query database
    let categories = await this.prisma.category.findMany({
      orderBy: { display_order: 'asc' },
      include: {
        menu_items: {
          where: {
            tenant_id: tenantId,
            is_available: true,
            is_deleted: false,
            ...(categoryId && { category_id: categoryId }),
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    // Filter out empty categories
    categories = categories.filter((cat) => cat.menu_items.length > 0);

    // Build response
    const menuResponse: MenuResponseDto = {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        display_order: cat.display_order,
        items: cat.menu_items.map((item) => this.mapMenuItemToResponse(item)),
      })),
    };

    // Cache the menu
    await this.cacheService.set(cacheKey, menuResponse, 300); // 5-minute cache

    this.logger.log(`Menu retrieved from database for tenant: ${tenantId}`);
    return menuResponse;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<CategoryWithItemsDto[]> {
    const cacheKey = 'menu:categories:all';

    // Try cache
    const cached = await this.cacheService.get<CategoryWithItemsDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const categories = await this.prisma.category.findMany({
      orderBy: { display_order: 'asc' },
    });

    const response = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      display_order: cat.display_order,
      items: [],
    }));

    // Cache
    await this.cacheService.set(cacheKey, response, 300);

    return response;
  }

  /**
   * Create menu item (manager only)
   */
  async createMenuItem(tenantId: string, dto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    try {
      // Verify category exists
      const category = await this.prisma.category.findUnique({
        where: { id: dto.category_id },
      });

      if (!category) {
        throw new BadRequestException(`Category ${dto.category_id} not found`);
      }

      // Create menu item
      const menuItem = await this.prisma.menuItem.create({
        data: {
          tenant_id: tenantId,
          category_id: dto.category_id,
          name: dto.name,
          description: dto.description,
          image_url: dto.image_url,
          price: dto.price,
          cost_price: dto.cost_price,
          discount_percentage: dto.discount_percentage || 0,
          dietary_tags: dto.dietary_tags || [],
          preparation_time: dto.preparation_time || 0,
          is_available: true,
        },
      });

      // Invalidate cache
      await this.cacheService.invalidateMenuCache(tenantId);

      return this.mapMenuItemToResponse(menuItem);
    } catch (error) {
      this.logger.error(`Error creating menu item:`, error);
      throw error;
    }
  }

  /**
   * Update menu item (manager only)
   */
  async updateMenuItem(tenantId: string, itemId: string, dto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
    try {
      // Verify item exists and belongs to tenant
      const item = await this.prisma.menuItem.findFirst({
        where: { id: itemId, tenant_id: tenantId },
      });

      if (!item) {
        throw new BadRequestException('Menu item not found');
      }

      // Update menu item
      const updated = await this.prisma.menuItem.update({
        where: { id: itemId },
        data: {
          name: dto.name,
          description: dto.description,
          image_url: dto.image_url,
          price: dto.price,
          cost_price: dto.cost_price,
          discount_percentage: dto.discount_percentage,
          dietary_tags: dto.dietary_tags,
          preparation_time: dto.preparation_time,
          is_available: dto.is_available !== undefined ? dto.is_available : item.is_available,
        },
      });

      // Invalidate cache
      await this.cacheService.invalidateMenuCache(tenantId);

      return this.mapMenuItemToResponse(updated);
    } catch (error) {
      this.logger.error(`Error updating menu item:`, error);
      throw error;
    }
  }

  /**
   * Delete menu item (soft delete)
   */
  async deleteMenuItem(tenantId: string, itemId: string): Promise<void> {
    try {
      // Verify item exists and belongs to tenant
      const item = await this.prisma.menuItem.findFirst({
        where: { id: itemId, tenant_id: tenantId },
      });

      if (!item) {
        throw new BadRequestException('Menu item not found');
      }

      // Soft delete
      await this.prisma.menuItem.update({
        where: { id: itemId },
        data: { is_deleted: true },
      });

      // Invalidate cache
      await this.cacheService.invalidateMenuCache(tenantId);

      this.logger.log(`Menu item ${itemId} deleted for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error deleting menu item:`, error);
      throw error;
    }
  }

  /**
   * Get single menu item by ID
   */
  async getMenuItem(itemId: string): Promise<MenuItemResponseDto> {
    const cacheKey = CacheService.generateItemKey(itemId);

    // Try cache
    const cached = await this.cacheService.get<MenuItemResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new BadRequestException('Menu item not found');
    }

    const response = this.mapMenuItemToResponse(item);

    // Cache
    await this.cacheService.set(cacheKey, response, 300);

    return response;
  }

  /**
   * Map Prisma MenuItem to DTO response
   */
  private mapMenuItemToResponse(item: any): MenuItemResponseDto {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      price: Number(item.price),
      cost_price: item.cost_price ? Number(item.cost_price) : undefined,
      discount_percentage: item.discount_percentage,
      dietary_tags: item.dietary_tags || [],
      preparation_time: item.preparation_time,
      is_available: item.is_available,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
