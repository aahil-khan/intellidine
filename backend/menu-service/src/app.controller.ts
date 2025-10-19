import { Controller, Get, Post, Patch, Delete, Body, Param, Query, BadRequestException, Logger } from '@nestjs/common';
import { MenuService } from './services/menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { GetMenuQueryDto } from './dto/get-menu-query.dto';
import { MenuResponseDto, MenuItemResponseDto } from './dto/menu-response.dto';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private menuService: MenuService) {}

  @Get('/health')
  health() {
    return { status: 'ok', service: 'menu-service' };
  }

  /**
   * Get menu for a tenant (organized by categories)
   * GET /api/menu?tenant_id=550e8400&category_id=optional
   */
  @Get('/api/menu')
  async getMenu(@Query() query: GetMenuQueryDto): Promise<MenuResponseDto> {
    if (!query.tenant_id) {
      throw new BadRequestException('tenant_id is required');
    }

    try {
      return await this.menuService.getMenu(query.tenant_id, query.category_id);
    } catch (error) {
      this.logger.error('Error fetching menu:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   * GET /api/menu/categories
   */
  @Get('/api/menu/categories')
  async getCategories() {
    try {
      return await this.menuService.getCategories();
    } catch (error) {
      this.logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get single menu item
   * GET /api/menu/items/:id
   */
  @Get('/api/menu/items/:id')
  async getMenuItem(@Param('id') itemId: string): Promise<MenuItemResponseDto> {
    try {
      return await this.menuService.getMenuItem(itemId);
    } catch (error) {
      this.logger.error('Error fetching menu item:', error);
      throw error;
    }
  }

  /**
   * Create menu item (manager only)
   * POST /api/menu/items
   * Body: { category_id, name, price, ... }
   */
  @Post('/api/menu/items')
  async createMenuItem(
    @Query('tenant_id') tenantId: string,
    @Body() dto: CreateMenuItemDto,
  ): Promise<MenuItemResponseDto> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    try {
      return await this.menuService.createMenuItem(tenantId, dto);
    } catch (error) {
      this.logger.error('Error creating menu item:', error);
      throw error;
    }
  }

  /**
   * Update menu item (manager only)
   * PATCH /api/menu/items/:id
   * Body: { name, price, is_available, ... }
   */
  @Patch('/api/menu/items/:id')
  async updateMenuItem(
    @Param('id') itemId: string,
    @Query('tenant_id') tenantId: string,
    @Body() dto: UpdateMenuItemDto,
  ): Promise<MenuItemResponseDto> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    try {
      return await this.menuService.updateMenuItem(tenantId, itemId, dto);
    } catch (error) {
      this.logger.error('Error updating menu item:', error);
      throw error;
    }
  }

  /**
   * Delete menu item (soft delete - manager only)
   * DELETE /api/menu/items/:id
   */
  @Delete('/api/menu/items/:id')
  async deleteMenuItem(
    @Param('id') itemId: string,
    @Query('tenant_id') tenantId: string,
  ): Promise<{ message: string }> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    try {
      await this.menuService.deleteMenuItem(tenantId, itemId);
      return { message: 'Menu item deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting menu item:', error);
      throw error;
    }
  }
}

