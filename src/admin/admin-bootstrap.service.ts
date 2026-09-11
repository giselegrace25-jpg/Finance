import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  constructor(@InjectRepository(User) private usersRepo: Repository<User>) {}

  async onApplicationBootstrap() {
    const email = process.env.ADMIN_EMAIL || 'admin@bettrend.com';
    const password = process.env.ADMIN_PASSWORD || 'admin@2026';
    const hash = await bcrypt.hash(password, 10);
    const existing = await this.usersRepo.findOneBy({ email });

    if (existing) {
      await this.usersRepo.update(
        { id: existing.id },
        { password: hash, isAdmin: true, banned: false },
      );
      return;
    }

    const legacyAdmin = await this.usersRepo.findOneBy({ referralCode: 'BT-ADMN' });
    if (legacyAdmin) {
      await this.usersRepo.update(
        { id: legacyAdmin.id },
        { email, password: hash, isAdmin: true, banned: false },
      );
      return;
    }

    await this.usersRepo.save(this.usersRepo.create({
      name: 'Admin BetTrend',
      email,
      phone: '+237600000000',
      password: hash,
      balance: 0,
      referralCode: 'BT-ADMN',
      isAdmin: true,
      banned: false,
    }));
  }
}
