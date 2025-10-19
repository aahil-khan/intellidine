export class MenuItemResponseDto {
  id!: string;
  tenant_id!: string;
  category_id!: string;
  name!: string;
  description?: string;
  image_url?: string;
  price!: number;
  cost_price?: number;
  original_price?: number;
  discount_percentage!: number;
  dietary_tags!: string[];
  preparation_time!: number;
  is_available!: boolean;
  created_at!: Date;
  updated_at!: Date;
}

export class MenuResponseDto {
  categories!: CategoryWithItemsDto[];
}

export class CategoryWithItemsDto {
  id!: string;
  name!: string;
  display_order!: number;
  items!: MenuItemResponseDto[];
}
