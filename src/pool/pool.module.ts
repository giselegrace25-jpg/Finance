import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from '../positions/position.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Setting } from '../common/setting.entity';
import { PoolService } from './pool.service';
import { PoolController } from './pool.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Position, User, Transaction, Setting])],
  controllers: [PoolController],
  providers: [PoolService],
})
export class PoolModule {}
