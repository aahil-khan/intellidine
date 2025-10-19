import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MenuService } from './services/menu.service';
import { CacheService } from './services/cache.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [MenuService, CacheService],
})
export class AppModule {}

