import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { OtpService } from './services/otp.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [OtpService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware will be configured here later
  }
}

