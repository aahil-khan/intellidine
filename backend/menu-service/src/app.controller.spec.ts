/**
 * Menu Service Controller Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AppController } from './app.controller';
import { MenuService } from './services/menu.service';
import { GetMenuQueryDto } from './dto/get-menu-query.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuResponseDto, MenuItemResponseDto, CategoryWithItemsDto } from './dto/menu-response.dto';

describe('Menu Service - AppController', () => {
  let controller: AppController;
  let menuService: MenuService;

  const mockMenuService = {
    getMenu: jest.fn(),
    getCategories: jest.fn(),
    getMenuItem: jest.fn(),
    createMenuItem: jest.fn(),
    updateMenuItem: jest.fn(),
    deleteMenuItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: MenuService,
          useValue: mockMenuService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    menuService = module.get<MenuService>(MenuService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', () => {
      const result = controller.health();
      expect(result).toEqual({
        status: 'ok',
        service: 'menu-service',
      });
    });
  });

  describe('GET /api/menu', () => {
    it('should retrieve menu for tenant organized by categories', async () => {
      const tenantId = 'tenant-123';
      const categoryId = undefined;
      
      const mockMenuItem: MenuItemResponseDto = {
        id: 'item-1',
        tenant_id: 'tenant-123',
        category_id: 'cat-1',
        name: 'Biryani',
        price: 250,
        is_available: true,
        description: 'Fragrant basmati rice',
        discount_percentage: 0,
        dietary_tags: [],
        preparation_time: 30,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockCategory: CategoryWithItemsDto = {
        id: 'cat-1',
        name: 'Main Course',
        display_order: 1,
        items: [mockMenuItem],
      };

      const mockMenuResponse: MenuResponseDto = {
        categories: [mockCategory],
      };

      const query: GetMenuQueryDto = { tenant_id: tenantId };
      jest.spyOn(menuService, 'getMenu').mockResolvedValue(mockMenuResponse);

      const result = await controller.getMenu(query);

      expect(result).toEqual(mockMenuResponse);
      expect(menuService.getMenu).toHaveBeenCalledWith(tenantId, undefined);
    });

    it('should filter menu items by category', async () => {
      const tenantId = 'tenant-123';
      const categoryId = 'cat-1';
      
      const mockMenuItem: MenuItemResponseDto = {
        id: 'item-1',
        tenant_id: 'tenant-123',
        category_id: 'cat-1',
        name: 'Biryani',
        price: 250,
        is_available: true,
        description: 'Fragrant basmati rice',
        discount_percentage: 0,
        dietary_tags: [],
        preparation_time: 30,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockCategory: CategoryWithItemsDto = {
        id: 'cat-1',
        name: 'Main Course',
        display_order: 1,
        items: [mockMenuItem],
      };

      const mockMenuResponse: MenuResponseDto = {
        categories: [mockCategory],
      };

      const query: GetMenuQueryDto = { tenant_id: tenantId, category_id: categoryId };
      jest.spyOn(menuService, 'getMenu').mockResolvedValue(mockMenuResponse);

      const result = await controller.getMenu(query);

      expect(result).toEqual(mockMenuResponse);
      expect(menuService.getMenu).toHaveBeenCalledWith(tenantId, categoryId);
    });

    it('should throw BadRequestException when tenant_id is missing', async () => {
      const query: GetMenuQueryDto = {};

      await expect(controller.getMenu(query)).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      const query: GetMenuQueryDto = { tenant_id: 'tenant-123' };
      const error = new Error('Database connection failed');
      
      jest.spyOn(menuService, 'getMenu').mockRejectedValue(error);

      await expect(controller.getMenu(query)).rejects.toThrow(error);
    });
  });

  describe('GET /api/menu/categories', () => {
    it('should retrieve all categories', async () => {
      const mockCategory: CategoryWithItemsDto = {
        id: 'cat-1',
        name: 'Main Course',
        display_order: 1,
        items: [],
      };

      jest.spyOn(menuService, 'getCategories').mockResolvedValue([mockCategory]);

      const result = await controller.getCategories();

      expect(result).toEqual([mockCategory]);
      expect(result.length).toBe(1);
      expect(menuService.getCategories).toHaveBeenCalled();
    });

    it('should handle errors when fetching categories', async () => {
      const error = new Error('Failed to fetch categories');
      jest.spyOn(menuService, 'getCategories').mockRejectedValue(error);

      await expect(controller.getCategories()).rejects.toThrow(error);
    });
  });

  describe('GET /api/menu/items/:id', () => {
    it('should retrieve a single menu item by id', async () => {
      const itemId = 'item-1';
      const mockItem: MenuItemResponseDto = {
        id: 'item-1',
        tenant_id: 'tenant-123',
        category_id: 'cat-1',
        name: 'Biryani',
        price: 250,
        is_available: true,
        description: 'Fragrant basmati rice',
        discount_percentage: 0,
        dietary_tags: [],
        preparation_time: 30,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(menuService, 'getMenuItem').mockResolvedValue(mockItem);

      const result = await controller.getMenuItem(itemId);

      expect(result).toEqual(mockItem);
      expect(result.name).toBe('Biryani');
      expect(menuService.getMenuItem).toHaveBeenCalledWith(itemId);
    });

    it('should handle item not found error', async () => {
      const itemId = 'non-existent-id';
      const error = new Error('Menu item not found');
      
      jest.spyOn(menuService, 'getMenuItem').mockRejectedValue(error);

      await expect(controller.getMenuItem(itemId)).rejects.toThrow(error);
    });
  });

  describe('POST /api/menu/items', () => {
    it('should create a new menu item', async () => {
      const tenantId = 'tenant-123';
      const createDto: CreateMenuItemDto = {
        category_id: 'cat-1',
        name: 'Butter Chicken',
        price: 350,
        description: 'Creamy chicken curry',
        cost_price: 150,
        discount_percentage: 5,
        dietary_tags: [],
        preparation_time: 25,
      };

      const mockCreatedItem: MenuItemResponseDto = {
        id: 'item-new',
        tenant_id: tenantId,
        category_id: 'cat-1',
        name: 'Butter Chicken',
        price: 350,
        is_available: true,
        description: 'Creamy chicken curry',
        discount_percentage: 5,
        dietary_tags: [],
        preparation_time: 25,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(menuService, 'createMenuItem').mockResolvedValue(mockCreatedItem);

      const result = await controller.createMenuItem(tenantId, createDto);

      expect(result).toEqual(mockCreatedItem);
      expect(result.id).toBe('item-new');
      expect(menuService.createMenuItem).toHaveBeenCalledWith(tenantId, createDto);
    });

    it('should validate required fields', async () => {
      const tenantId = 'tenant-123';
      const createDto: CreateMenuItemDto = {
        category_id: '',
        name: '',
        price: -10,
      };

      jest.spyOn(menuService, 'createMenuItem').mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.createMenuItem(tenantId, createDto)).rejects.toThrow();
    });

    it('should handle service errors during creation', async () => {
      const tenantId = 'tenant-123';
      const createDto: CreateMenuItemDto = {
        category_id: 'cat-1',
        name: 'Test Item',
        price: 100,
      };

      const error = new Error('Database error');
      jest.spyOn(menuService, 'createMenuItem').mockRejectedValue(error);

      await expect(controller.createMenuItem(tenantId, createDto)).rejects.toThrow(error);
    });
  });

  describe('PATCH /api/menu/items/:id', () => {
    it('should update an existing menu item', async () => {
      const itemId = 'item-1';
      const tenantId = 'tenant-123';
      const updateDto: UpdateMenuItemDto = {
        name: 'Biryani Special',
        price: 300,
        description: 'Updated description',
      };

      const mockUpdatedItem: MenuItemResponseDto = {
        id: 'item-1',
        tenant_id: tenantId,
        category_id: 'cat-1',
        name: 'Biryani Special',
        price: 300,
        is_available: true,
        description: 'Updated description',
        discount_percentage: 0,
        dietary_tags: [],
        preparation_time: 30,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(menuService, 'updateMenuItem').mockResolvedValue(mockUpdatedItem);

      const result = await controller.updateMenuItem(itemId, tenantId, updateDto);

      expect(result).toEqual(mockUpdatedItem);
      expect(result.name).toBe('Biryani Special');
      expect(result.price).toBe(300);
      expect(menuService.updateMenuItem).toHaveBeenCalledWith(tenantId, itemId, updateDto);
    });

    it('should handle item not found during update', async () => {
      const itemId = 'non-existent-id';
      const tenantId = 'tenant-123';
      const updateDto: UpdateMenuItemDto = {
        name: 'Updated',
        price: 100,
      };

      const error = new Error('Menu item not found');
      jest.spyOn(menuService, 'updateMenuItem').mockRejectedValue(error);

      await expect(controller.updateMenuItem(itemId, tenantId, updateDto)).rejects.toThrow(error);
    });

    it('should allow partial updates', async () => {
      const itemId = 'item-1';
      const tenantId = 'tenant-123';
      const updateDto: UpdateMenuItemDto = {
        price: 275,
      };

      const mockUpdatedItem: MenuItemResponseDto = {
        id: 'item-1',
        tenant_id: tenantId,
        category_id: 'cat-1',
        name: 'Biryani',
        price: 275,
        is_available: true,
        description: 'Fragrant basmati rice',
        discount_percentage: 0,
        dietary_tags: [],
        preparation_time: 30,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(menuService, 'updateMenuItem').mockResolvedValue(mockUpdatedItem);

      const result = await controller.updateMenuItem(itemId, tenantId, updateDto);

      expect(result.price).toBe(275);
    });
  });

  describe('DELETE /api/menu/items/:id', () => {
    it('should delete a menu item (soft delete)', async () => {
      const itemId = 'item-1';
      const tenantId = 'tenant-123';

      jest.spyOn(menuService, 'deleteMenuItem').mockResolvedValue(undefined);

      const result = await controller.deleteMenuItem(itemId, tenantId);

      expect(result).toEqual({ message: 'Menu item deleted successfully' });
      expect(menuService.deleteMenuItem).toHaveBeenCalledWith(tenantId, itemId);
    });

    it('should handle item not found during deletion', async () => {
      const itemId = 'non-existent-id';
      const tenantId = 'tenant-123';

      const error = new Error('Menu item not found');
      jest.spyOn(menuService, 'deleteMenuItem').mockRejectedValue(error);

      await expect(controller.deleteMenuItem(itemId, tenantId)).rejects.toThrow(error);
    });

    it('should handle authorization errors', async () => {
      const itemId = 'item-1';
      const tenantId = 'wrong-tenant';

      const error = new Error('Unauthorized');
      jest.spyOn(menuService, 'deleteMenuItem').mockRejectedValue(error);

      await expect(controller.deleteMenuItem(itemId, tenantId)).rejects.toThrow(error);
    });
  });
});
