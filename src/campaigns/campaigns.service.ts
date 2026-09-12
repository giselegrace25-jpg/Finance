import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './campaign.entity';

const SEED_PLANS = [
  // 1XBET
  { slug: '1XBET-SIMPLE', platform: '1XBET', planType: 'Simple', amount: 6000, dailyRatePercent: 10, dailyRevenue: 600, monthlyRevenue: 18000, monthDays: 30, daysToRecover: 10 },
  { slug: '1XBET-PLUS', platform: '1XBET', planType: 'Plus', amount: 14000, dailyRatePercent: 16, dailyRevenue: 2240, monthlyRevenue: 67200, monthDays: 30, daysToRecover: 6 },
  { slug: '1XBET-MAX', platform: '1XBET', planType: 'Max', amount: 30000, dailyRatePercent: 28, dailyRevenue: 8400, monthlyRevenue: 252000, monthDays: 30, daysToRecover: 4 },
  { slug: '1XBET-MAXPLUS', platform: '1XBET', planType: 'MaxPlus', amount: 62000, dailyRatePercent: 28, dailyRevenue: 17360, monthlyRevenue: 520600, monthDays: 30, daysToRecover: 4 },

  // BETWINNER
  { slug: 'BETWINNER-SIMPLE', platform: 'BETWINNER', planType: 'Simple', amount: 4000, dailyRatePercent: 10, dailyRevenue: 400, monthlyRevenue: 12000, monthDays: 30, daysToRecover: 10 },
  { slug: 'BETWINNER-PLUS', platform: 'BETWINNER', planType: 'Plus', amount: 10000, dailyRatePercent: 18, dailyRevenue: 1800, monthlyRevenue: 54000, monthDays: 30, daysToRecover: 6 },
  { slug: 'BETWINNER-MAX', platform: 'BETWINNER', planType: 'Max', amount: 22000, dailyRatePercent: 26, dailyRevenue: 5720, monthlyRevenue: 171600, monthDays: 30, daysToRecover: 4 },
  { slug: 'BETWINNER-MAXPLUS', platform: 'BETWINNER', planType: 'MaxPlus', amount: 46000, dailyRatePercent: 30, dailyRevenue: 13800, monthlyRevenue: 414000, monthDays: 30, daysToRecover: 3 },

  // BETPAWA
  { slug: 'BETPAWA-SIMPLE', platform: 'BETPAWA', planType: 'Simple', amount: 2000, dailyRatePercent: 10, dailyRevenue: 200, monthlyRevenue: 3000, monthDays: 15, daysToRecover: 10 },
  { slug: 'BETPAWA-PLUS', platform: 'BETPAWA', planType: 'Plus', amount: 4200, dailyRatePercent: 18, dailyRevenue: 756, monthlyRevenue: 11340, monthDays: 15, daysToRecover: 5 },
  { slug: 'BETPAWA-MAX', platform: 'BETPAWA', planType: 'Max', amount: 8600, dailyRatePercent: 26, dailyRevenue: 2236, monthlyRevenue: 33540, monthDays: 15, daysToRecover: 4 },
  { slug: 'BETPAWA-MAXPLUS', platform: 'BETPAWA', planType: 'MaxPlus', amount: 17400, dailyRatePercent: 30, dailyRevenue: 5220, monthlyRevenue: 78300, monthDays: 15, daysToRecover: 3 },

  // MELBET
  { slug: 'MELBET-SIMPLE', platform: 'MELBET', planType: 'Simple', amount: 8000, dailyRatePercent: 10, dailyRevenue: 800, monthlyRevenue: 24000, monthDays: 30, daysToRecover: 10 },
  { slug: 'MELBET-PLUS', platform: 'MELBET', planType: 'Plus', amount: 18000, dailyRatePercent: 17, dailyRevenue: 3060, monthlyRevenue: 91800, monthDays: 30, daysToRecover: 6 },
  { slug: 'MELBET-MAX', platform: 'MELBET', planType: 'Max', amount: 36000, dailyRatePercent: 26, dailyRevenue: 9360, monthlyRevenue: 280800, monthDays: 30, daysToRecover: 4 },
  { slug: 'MELBET-MAXPLUS', platform: 'MELBET', planType: 'MaxPlus', amount: 72000, dailyRatePercent: 38, dailyRevenue: 27360, monthlyRevenue: 820800, monthDays: 30, daysToRecover: 3 },
];

@Injectable()
export class CampaignsService implements OnModuleInit {
  constructor(@InjectRepository(Plan) private repo: Repository<Plan>) {}

  async onModuleInit() {
    for (const data of SEED_PLANS) {
      const exists = await this.repo.findOneBy({ slug: data.slug });
      if (!exists) await this.repo.save(this.repo.create({ ...data, active: true } as any));
    }
  }

  findAll() {
    return this.repo.find({ where: { active: true }, order: { platform: 'ASC', amount: 'ASC' } });
  }

  findByPlatform(platform: string) {
    return this.repo.find({ where: { platform: platform as any, active: true }, order: { amount: 'ASC' } });
  }

  findOne(slug: string) {
    return this.repo.findOneBy({ slug });
  }
}
