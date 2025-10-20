import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DiscountRuleEngine } from './services/discount-rule.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [DiscountRuleEngine],
})
export class AppModule {}

