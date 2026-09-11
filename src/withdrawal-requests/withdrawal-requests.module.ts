import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalRequestsController } from './withdrawal-requests.controller';
import { WithdrawalRequestsService } from './withdrawal-requests.service';
import { WithdrawalRequest } from './withdrawal-request.entity';
import { WithdrawalAccount } from '../withdrawal-accounts/withdrawal-account.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Setting } from '../common/setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WithdrawalRequest, WithdrawalAccount, User, Transaction, Setting])],
  controllers: [WithdrawalRequestsController],
  providers: [WithdrawalRequestsService],
  exports: [WithdrawalRequestsService],
})
export class WithdrawalRequestsModule {}
