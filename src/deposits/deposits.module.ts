import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deposit } from './deposit.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Deposit, User, Transaction])],
  controllers: [DepositsController],
  providers: [DepositsService],
  exports: [DepositsService, TypeOrmModule],
})
export class DepositsModule {}
