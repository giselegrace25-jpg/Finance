import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Position } from '../positions/position.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Setting } from '../common/setting.entity';

@Injectable()
export class PoolService {
  constructor(
    @InjectRepository(Position) private posRepo: Repository<Position>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
    private dataSource: DataSource,
  ) {}

  private async getSetting(key: string, defaultVal: string): Promise<string> {
    const row = await this.settingRepo.findOneBy({ key });
    return row ? row.value : defaultVal;
  }

  async getPoolState() {
    const deposits = await this.txRepo
      .createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'total')
      .where("t.type = 'deposit'").getRawOne();
    const withdrawn = await this.txRepo
      .createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'total')
      .where("t.type = 'withdraw'").getRawOne();
    const yieldPaid = await this.txRepo
      .createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'total')
      .where("t.type = 'yield'").getRawOne();
    const fees = await this.txRepo
      .createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'total')
      .where("t.type IN ('withdrawal_fee','maintenance_fee','game_fee')").getRawOne();
    const referralPaid = await this.txRepo
      .createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'total')
      .where("t.type = 'referral'").getRawOne();

    const totalDeposits = Number(deposits.total);
    const totalWithdrawn = Number(withdrawn.total);
    const totalYieldPaid = Number(yieldPaid.total);
    const totalFees = Number(fees.total);
    const totalReferral = Number(referralPaid.total);

    const poolCash = totalDeposits - totalWithdrawn - totalYieldPaid - totalReferral + totalFees;
    const activePositions = await this.posRepo.count({ where: { active: true } });
    const userCount = await this.usersRepo.count();

    return {
      totalDeposits, totalWithdrawn, totalYieldPaid, totalFees, totalReferral,
      poolCash: Math.max(0, poolCash),
      activePositions, userCount,
    };
  }

  async getPublicStatus() {
    const minWithdrawal = await this.getSetting('min_withdrawal', '2000');
    const withdrawalFee = await this.getSetting('withdrawal_fee_percent', '20');
    return {
      status: 'operational',
      withdrawalSchedule: 'Lundi - Samedi, 24h/24',
      minWithdrawal: Number(minWithdrawal),
      withdrawalFee: `${withdrawalFee}%`,
    };
  }

  private isYieldDue(pos: Position, now = new Date()): boolean {
    const lastPaidAt = pos.lastYieldAt ? new Date(pos.lastYieldAt) : null;
    const baseDate = lastPaidAt ?? new Date(pos.createdAt);
    return now.getTime() - baseDate.getTime() >= 24 * 60 * 60 * 1000;
  }

  @Cron('* * * * *', { timeZone: 'Africa/Douala' })
  async dailyYieldTick() {
    const positions = await this.posRepo.find({ where: { active: true } });
    const maintenancePercent = Number(await this.getSetting('maintenance_fee_percent', '3')) / 100;
    let totalPaid = 0;
    let paidCount = 0;
    const now = new Date();

    for (const pos of positions) {
      if (!this.isYieldDue(pos, now)) continue;

      const invested = Number(pos.investedAmount);
      const grossGain = Math.round(invested * (pos.dailyRatePercent / 100));
      const maintenanceFee = Math.round(grossGain * maintenancePercent);
      const netGain = grossGain - maintenanceFee;

      if (netGain <= 0) continue;

      await this.dataSource.transaction(async (em) => {
        await em.increment(User, { id: pos.userId }, 'balance', netGain);
        await em.update(Position, { id: pos.id }, {
          totalEarned: Number(pos.totalEarned) + netGain,
          lastYieldAt: now,
        });
        await em.save(em.create(Transaction, {
          userId: pos.userId, type: 'yield', amount: netGain,
          description: `Revenu journalier ${pos.platform} ${pos.planType}`,
        }));
        if (maintenanceFee > 0) {
          await em.save(em.create(Transaction, {
            userId: pos.userId, type: 'maintenance_fee', amount: maintenanceFee,
            description: `Frais maintenance - ${pos.platform}`,
          }));
        }
      });
      totalPaid += netGain;
      paidCount++;
    }
    if (paidCount > 0) {
      console.log(`[PoolService] Daily yield: ${totalPaid} FCFA verse a ${paidCount} positions`);
    }
  }
}
