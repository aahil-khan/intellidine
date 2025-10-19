import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  async onModuleInit() {
    // This connects to the database when the module is initialized.
    await this.$connect();
  }

  async onApplicationShutdown() {
    // This disconnects from the database when the application shuts down.
    await this.$disconnect();
  }
}
