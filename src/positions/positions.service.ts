import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Position } from './position.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Plan } from '../campaigns/campaign.entity';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position) private posRepo: Repository<Position>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    private dataSource: DataSource,
  ) {}

  async getPositions(userId: number) {
    return this.posRepo.find({ where: { userId, active: true } });
  }

  async invest(userId: number, planSlug: string, customAmount?: number) {
    const plan = await this.planRepo.findOneBy({ slug: planSlug, active: true });
    if (!plan) throw new BadRequestException('Plan introuvable.');

    const planAmount = Number(plan.amount);
    const investAmount = customAmount ?? planAmount;
    const minAmount = Math.max(2000, planAmount);
    if (investAmount < minAmount) throw new BadRequestException(`Montant minimum : ${minAmount} FCFA.`);

    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user || Number(user.balance) < investAmount) throw new BadRequestException(`Solde insuffisant. Vous avez ${Number(user?.balance ?? 0)} FCFA.`);

    let position: Position;
    await this.dataSource.transaction(async (em) => {
      await em.decrement(User, { id: userId }, 'balance', investAmount);
      position = await em.save(em.create(Position, {
        userId,
        planId: plan.id,
        platform: plan.platform,
        planType: plan.planType,
        investedAmount: investAmount,
        dailyRatePercent: plan.dailyRatePercent,
        totalEarned: 0,
        active: true,
      }));
      await em.save(em.create(Transaction, {
        userId,
        type: 'invest',
        amount: investAmount,
        description: `Souscription ${plan.platform} ${plan.planType}`,
      }));
    });

    const updated = await this.usersRepo.findOneBy({ id: userId });
    return { balance: Number(updated?.balance), position: position! };
  }
}
