import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Position } from '../positions/position.entity';
import { Setting } from '../common/setting.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Position) private posRepo: Repository<Position>,
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
  ) {}

  async updateProfile(userId: number, data: { name?: string; email?: string; phone?: string }) {
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    if (data.email && data.email !== user.email) {
      const existing = await this.usersRepo.findOneBy({ email: data.email });
      if (existing) throw new ConflictException('Cette adresse email est déjà utilisée.');
    }

    const update: Partial<User> = {};
    if (data.name?.trim()) update.name = data.name.trim();
    if (data.email?.trim()) update.email = data.email.trim();
    if (data.phone?.trim()) update.phone = data.phone.trim();

    await this.usersRepo.update({ id: userId }, update);
    const updated = await this.usersRepo.findOneBy({ id: userId });
    return { id: updated!.id, name: updated!.name, email: updated!.email, phone: updated!.phone };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    if (!oldPassword || !newPassword) throw new BadRequestException('Les deux mots de passe sont requis.');
    if (newPassword.length < 6) throw new BadRequestException('Le nouveau mot de passe doit faire au moins 6 caractères.');

    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new BadRequestException('Mot de passe actuel incorrect.');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.update({ id: userId }, { password: hashed });
    return { ok: true };
  }

  async getPublicConfig() {
    const rows = await this.settingRepo.find();
    const map: Record<string, string> = { deposit_phone_mtn: '', deposit_phone_orange: '' };
    for (const r of rows) map[r.key] = r.value;
    return {
      depositPhoneMtn: map.deposit_phone_mtn || '',
      depositPhoneOrange: map.deposit_phone_orange || '',
    };
  }

  async getReferrals(userId: number) {
    const referrals = await this.usersRepo.find({
      where: { referredBy: userId },
      select: { id: true, name: true, phone: true, createdAt: true },
      order: { createdAt: 'DESC' },
    });

    const referralEarnings = await this.txRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.userId = :userId AND t.type = :type', { userId, type: 'referral' })
      .getRawOne();

    return {
      count: referrals.length,
      totalEarnings: Number(referralEarnings.total),
      referrals: referrals.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        joinedAt: r.createdAt,
      })),
    };
  }

  async getProfile(userId: number) {
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const positions = await this.posRepo.find({ where: { userId, active: true } });
    const totalInvested = positions.reduce((s, p) => s + Number(p.investedAmount), 0);
    const totalEarned = positions.reduce((s, p) => s + Number(p.totalEarned), 0);

    const yieldTx = await this.txRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.userId = :userId AND t.type = :type', { userId, type: 'yield' })
      .getRawOne();

    const referralCount = await this.usersRepo.count({ where: { referredBy: userId } });
    const referralEarnings = await this.txRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.userId = :userId AND t.type = :type', { userId, type: 'referral' })
      .getRawOne();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: Number(user.balance),
      invested: totalInvested,
      totalYield: Number(yieldTx.total),
      totalEarned,
      referralCode: user.referralCode,
      referralCount,
      referralEarnings: Number(referralEarnings.total),
      memberSince: user.createdAt,
      positions,
    };
  }
}
