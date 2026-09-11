import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WithdrawalAccount } from './withdrawal-account.entity';

@Injectable()
export class WithdrawalAccountsService {
  constructor(
    @InjectRepository(WithdrawalAccount) private repo: Repository<WithdrawalAccount>,
  ) {}

  async getMyAccount(userId: number) {
    return this.repo.findOneBy({ userId }) ?? null;
  }

  async create(userId: number, accountNumber: string, accountName: string) {
    const existing = await this.repo.findOneBy({ userId });
    if (existing) throw new BadRequestException('Vous avez déjà configuré un compte de retrait. Ce numéro ne peut plus être modifié.');

    if (!accountNumber?.trim()) throw new BadRequestException('Le numéro de compte est requis.');
    if (!accountName?.trim()) throw new BadRequestException('Le nom du titulaire est requis.');

    const account = this.repo.create({ userId, accountNumber: accountNumber.trim(), accountName: accountName.trim(), isLocked: true });
    return this.repo.save(account);
  }

  async adminUnlock(userId: number) {
    const account = await this.repo.findOneBy({ userId });
    if (!account) throw new NotFoundException('Compte introuvable.');
    await this.repo.update({ userId }, { isLocked: false });
    return { ok: true };
  }

  async adminUpdate(userId: number, accountNumber: string, accountName: string) {
    const account = await this.repo.findOneBy({ userId });
    if (!account) throw new NotFoundException('Compte introuvable.');
    await this.repo.update({ userId }, { accountNumber: accountNumber.trim(), accountName: accountName.trim(), isLocked: true });
    return this.repo.findOneBy({ userId });
  }
}
