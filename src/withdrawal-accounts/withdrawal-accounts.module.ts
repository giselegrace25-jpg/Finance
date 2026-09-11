import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalAccountsController } from './withdrawal-accounts.controller';
import { WithdrawalAccountsService } from './withdrawal-accounts.service';
import { WithdrawalAccount } from './withdrawal-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WithdrawalAccount])],
  controllers: [WithdrawalAccountsController],
  providers: [WithdrawalAccountsService],
  exports: [WithdrawalAccountsService],
})
export class WithdrawalAccountsModule {}
