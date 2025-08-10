import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './db/data-source';
import { DataSource } from 'typeorm';
import { WalletModule } from './wallet/wallet.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions), WalletModule, CacheModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log('✅ Database connection established successfully!');
    } else {
      this.logger.error('❌ Failed to connect to the database!');
    }
  }
}
