import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Deposit } from './deposit.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';

@Injectable()
export class DepositsService {
  constructor(
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  async createRequest(userId: number, amount: number, proofUrl: string, provider?: string, transactionId?: string) {
    if (!amount || amount <= 0) throw new BadRequestException('Montant invalide.');
    if (!proofUrl) throw new BadRequestException('La preuve de paiement est requise.');

    if (transactionId) {
      const existing = await this.depositRepo.findOneBy({ transactionId });
      if (existing) throw new BadRequestException('Cet ID de transaction a déjà été utilisé.');
    }

    const deposit = this.depositRepo.create({
      userId,
      amount,
      proofUrl,
      ...(provider ? { provider } : {}),
      ...(transactionId ? { transactionId } : {}),
      status: 'pending',
    });
    await this.depositRepo.save(deposit);

    return deposit;
  }

  async getPendingForUser(userId: number) {
    return this.depositRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async getAllPending() {
    return this.depositRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      relations: { user: true },
    });
  }

  async getAll(status?: string) {
    const where = status ? { status: status as any } : {};
    return this.depositRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { user: true },
      take: 200,
    });
  }

  async approve(depositId: number, adminNote?: string) {
    const deposit = await this.depositRepo.findOneBy({ id: depositId });
    if (!deposit) throw new NotFoundException('Demande introuvable.');
    if (deposit.status !== 'pending') throw new BadRequestException('Cette demande a deja ete traitee.');

    await this.dataSource.transaction(async (em) => {
      await em.update(Deposit, { id: depositId }, {
        status: 'approved',
        adminNote: adminNote || undefined,
        reviewedAt: new Date(),
      });

      await em.increment(User, { id: deposit.userId }, 'balance', Number(deposit.amount));

      await em.save(em.create(Transaction, {
        userId: deposit.userId,
        type: 'deposit',
        amount: Number(deposit.amount),
        description: `Depot valide #${depositId}`,
      }));

      const user = await em.findOneBy(User, { id: deposit.userId });
      const depositCount = await em.count(Transaction, { where: { userId: deposit.userId, type: 'deposit' } });
      if (user?.referredBy && depositCount === 1) {
        const bonus = Math.round(Number(deposit.amount) * 0.15);
        await em.increment(User, { id: user.referredBy }, 'balance', bonus);
        await em.save(em.create(Transaction, {
          userId: user.referredBy,
          type: 'referral',
          amount: bonus,
          description: `Bonus parrainage (15% de ${deposit.amount} FCFA)`,
        }));
      }
    });

    return { ok: true, status: 'approved' };
  }

  async reject(depositId: number, adminNote?: string) {
    const deposit = await this.depositRepo.findOneBy({ id: depositId });
    if (!deposit) throw new NotFoundException('Demande introuvable.');
    if (deposit.status !== 'pending') throw new BadRequestException('Cette demande a deja ete traitee.');

    await this.depositRepo.update({ id: depositId }, {
      status: 'rejected',
      adminNote: adminNote || 'Preuve non valide',
      reviewedAt: new Date(),
    });

    return { ok: true, status: 'rejected' };
  }

  async getStats() {
    const pending = await this.depositRepo.count({ where: { status: 'pending' } });
    const approved = await this.depositRepo.count({ where: { status: 'approved' } });
    const rejected = await this.depositRepo.count({ where: { status: 'rejected' } });

    const totalApproved = await this.depositRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.amount), 0)', 'total')
      .where("d.status = 'approved'")
      .getRawOne();

    return { pending, approved, rejected, totalApproved: Number(totalApproved.total) };
  }
}
