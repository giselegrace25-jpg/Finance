import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PositionsModule } from './positions/positions.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PoolModule } from './pool/pool.module';
import { AdminModule } from './admin/admin.module';
import { DepositsModule } from './deposits/deposits.module';
import { AiModule } from './ai/ai.module';
import { WithdrawalAccountsModule } from './withdrawal-accounts/withdrawal-accounts.module';
import { WithdrawalRequestsModule } from './withdrawal-requests/withdrawal-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: +(config.get<string>('DB_PORT')?? '4000'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/*/.entity{.ts,.js}'],
        synchronize: true, // Mets true le temps du 1er déploiement pour créer les tables
        ssl: {
          rejectUnauthorized: true,
        },
        extra: {
          ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true,
          },
        },
      }),
    }),
    AuthModule,
    UsersModule,
    TransactionsModule,
    PositionsModule,
    CampaignsModule,
    PoolModule,
    AdminModule,
    DepositsModule,
    AiModule,
    WithdrawalAccountsModule,
    WithdrawalRequestsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
