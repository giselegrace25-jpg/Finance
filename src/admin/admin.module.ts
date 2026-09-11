import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Position } from '../positions/position.entity';
import { Plan } from '../campaigns/campaign.entity';
import { Deposit } from '../deposits/deposit.entity';
import { Setting } from '../common/setting.entity';
import { WithdrawalRequest } from '../withdrawal-requests/withdrawal-request.entity';
import { WithdrawalAccount } from '../withdrawal-accounts/withdrawal-account.entity';
import { WithdrawalRequestsService } from '../withdrawal-requests/withdrawal-requests.service';
import { WithdrawalAccountsService } from '../withdrawal-accounts/withdrawal-accounts.service';
import { DepositsModule } from '../deposits/deposits.module';
import { AdminBootstrapService } from './admin-bootstrap.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, Position, Plan, Deposit, Setting, WithdrawalRequest, WithdrawalAccount]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    DepositsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, WithdrawalRequestsService, WithdrawalAccountsService, AdminBootstrapService],
  exports: [AdminService],
})
export class AdminModule {}
