import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction } from './transaction.entity';
import { User } from '../users/user.entity';
import { Setting } from '../common/setting.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
    private dataSource: DataSource,
  ) {}

  private async getSetting(key: string, defaultVal: string): Promise<string> {
    const row = await this.settingRepo.findOneBy({ key });
    return row ? row.value : defaultVal;
  }

  async getHistory(userId: number) {
    return this.txRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async deposit(userId: number, amount: number) {
    if (!amount || amount <= 0) throw new BadRequestException('Montant invalide.');

    const referralBonusPercent = Number(await this.getSetting('referral_bonus_percent', '15')) / 100;

    await this.dataSource.transaction(async (em) => {
      await em.increment(User, { id: userId }, 'balance', amount);
      const tx = em.create(Transaction, { userId, type: 'deposit', amount, description: 'Depot' });
      await em.save(tx);

      const user = await em.findOneBy(User, { id: userId });
      const depositCount = await em.count(Transaction, { where: { userId, type: 'deposit' } });
      if (user?.referredBy && depositCount === 1) {
        const bonus = Math.round(amount * referralBonusPercent);
        await em.increment(User, { id: user.referredBy }, 'balance', bonus);
        await em.save(em.create(Transaction, {
          userId: user.referredBy, type: 'referral', amount: bonus,
          description: `Bonus parrainage (${Math.round(referralBonusPercent * 100)}% de ${amount} FCFA)`,
        }));
      }
    });

    const updated = await this.usersRepo.findOneBy({ id: userId });
    return { balance: Number(updated?.balance) };
  }

  async withdraw(userId: number, amount: number) {
    const minWithdrawal = Number(await this.getSetting('min_withdrawal', '2000'));
    const withdrawalsEnabled = (await this.getSetting('withdrawals_enabled', 'true')) === 'true';
    const feePercent = Number(await this.getSetting('withdrawal_fee_percent', '20')) / 100;

    if (!withdrawalsEnabled) throw new ForbiddenException('Les retraits sont temporairement desactives.');
    if (!amount || amount < minWithdrawal) throw new BadRequestException(`Montant minimum de retrait : ${minWithdrawal} FCFA.`);

    const now = new Date();
    const day = now.getDay();
    if (day === 0) throw new ForbiddenException('Les retraits sont disponibles du lundi au samedi uniquement.');

    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('Utilisateur introuvable.');
    if (user.banned) throw new ForbiddenException('Votre compte a ete suspendu.');

    const fee = Math.round(amount * feePercent);
    const totalDeducted = amount + fee;

    if (Number(user.balance) < totalDeducted) {
      throw new BadRequestException(`Solde insuffisant. Montant demande: ${amount} + frais ${Math.round(feePercent * 100)}%: ${fee} = ${totalDeducted} FCFA.`);
    }

    await this.dataSource.transaction(async (em) => {
      await em.decrement(User, { id: userId }, 'balance', totalDeducted);
      await em.save(em.create(Transaction, {
        userId, type: 'withdraw', amount, description: `Retrait (frais ${Math.round(feePercent * 100)}%: ${fee} FCFA)`,
      }));
      await em.save(em.create(Transaction, {
        userId, type: 'withdrawal_fee', amount: fee, description: `Frais de retrait ${Math.round(feePercent * 100)}%`,
      }));
    });

    const updated = await this.usersRepo.findOneBy({ id: userId });
    return { balance: Number(updated?.balance), netAmount: amount, fee };
  }
}
