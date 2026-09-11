import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WithdrawalRequest } from './withdrawal-request.entity';
import { WithdrawalAccount } from '../withdrawal-accounts/withdrawal-account.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Setting } from '../common/setting.entity';

@Injectable()
export class WithdrawalRequestsService {
  constructor(
    @InjectRepository(WithdrawalRequest) private repo: Repository<WithdrawalRequest>,
    @InjectRepository(WithdrawalAccount) private accountRepo: Repository<WithdrawalAccount>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
    private dataSource: DataSource,
  ) {}

  private async getSetting(key: string, defaultVal: string): Promise<string> {
    const row = await this.settingRepo.findOneBy({ key });
    return row ? row.value : defaultVal;
  }

  async createRequest(userId: number, amount: number) {
    const minWithdrawal = Number(await this.getSetting('min_withdrawal', '2000'));
    const withdrawalsEnabled = (await this.getSetting('withdrawals_enabled', 'true')) === 'true';
    const feePercent = Number(await this.getSetting('withdrawal_fee_percent', '20')) / 100;

    if (!withdrawalsEnabled) throw new ForbiddenException('Les retraits sont temporairement désactivés.');
    if (!amount || amount < minWithdrawal) throw new BadRequestException(`Montant minimum : ${minWithdrawal} FCFA.`);

    const now = new Date();
    if (now.getDay() === 0) throw new ForbiddenException('Les retraits sont disponibles du lundi au samedi uniquement.');

    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (user.banned) throw new ForbiddenException('Votre compte a été suspendu.');

    const account = await this.accountRepo.findOneBy({ userId });
    if (!account) throw new BadRequestException('Veuillez configurer votre compte de retrait avant de faire une demande.');

    const fee = Math.round(amount * feePercent);
    const netAmount = amount - fee;

    if (Number(user.balance) < amount) {
      throw new BadRequestException(`Solde insuffisant. Vous avez ${Number(user.balance)} FCFA, le retrait demande ${amount} FCFA.`);
    }

    let request: WithdrawalRequest;

    await this.dataSource.transaction(async (em) => {
      const result = await em.createQueryBuilder()
        .update(User)
        .set({ balance: () => `balance - ${amount}` })
        .where('id = :id AND balance >= :needed', { id: userId, needed: amount })
        .execute();
      if (result.affected === 0) {
        throw new BadRequestException('Solde insuffisant.');
      }

      await em.save(em.create(Transaction, {
        userId,
        type: 'withdraw',
        amount,
        description: `Demande retrait #pending (frais ${Math.round(feePercent * 100)}%: ${fee} FCFA)`,
      }));
      await em.save(em.create(Transaction, {
        userId,
        type: 'withdrawal_fee',
        amount: fee,
        description: `Frais de retrait ${Math.round(feePercent * 100)}%`,
      }));

      const req = em.create(WithdrawalRequest, {
        userId,
        amount,
        netAmount,
        fee,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        status: 'pending',
      });
      request = await em.save(req);
    });

    const updated = await this.usersRepo.findOneBy({ id: userId });
    return { ...request!, balance: Number(updated?.balance) };
  }

  async getMyRequests(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }

  async getAll(status?: string) {
    const where = status ? { status: status as any } : {};
    return this.repo.find({
      where,
      order: { createdAt: 'ASC' },
      relations: { user: true },
      take: 200,
    });
  }

  async complete(id: number, adminNote?: string) {
    const req = await this.repo.findOneBy({ id });
    if (!req) throw new NotFoundException('Demande introuvable.');
    if (req.status !== 'pending') throw new BadRequestException('Cette demande a déjà été traitée.');

    await this.repo.update({ id }, { status: 'completed', adminNote: adminNote || undefined, processedAt: new Date() });
    return { ok: true, status: 'completed' };
  }

  async reject(id: number, adminNote?: string) {
    const req = await this.repo.findOneBy({ id });
    if (!req) throw new NotFoundException('Demande introuvable.');
    if (req.status !== 'pending') throw new BadRequestException('Cette demande a déjà été traitée.');

    await this.dataSource.transaction(async (em) => {
      await em.update(WithdrawalRequest, { id }, {
        status: 'rejected',
        adminNote: adminNote || 'Demande rejetée',
        processedAt: new Date(),
      });
      await em.increment(User, { id: req.userId }, 'balance', Number(req.amount));
      await em.save(em.create(Transaction, {
        userId: req.userId,
        type: 'deposit',
        amount: Number(req.amount),
        description: `Remboursement retrait rejeté #${id}`,
      }));
    });

    return { ok: true, status: 'rejected' };
  }

  async getPendingCount() {
    return this.repo.count({ where: { status: 'pending' } });
  }
}
