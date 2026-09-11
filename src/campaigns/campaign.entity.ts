import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type Platform = '1XBET' | 'BETWINNER' | 'BETPAWA' | 'MELBET';
export type PlanType = 'Simple' | 'Plus' | 'Max' | 'MaxPlus';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  platform: Platform;

  @Column()
  planType: PlanType;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'float' })
  dailyRatePercent: number;

  @Column({ type: 'bigint' })
  dailyRevenue: number;

  @Column({ type: 'bigint' })
  monthlyRevenue: number;

  @Column({ type: 'int' })
  monthDays: number;

  @Column({ type: 'int' })
  daysToRecover: number;

  @Column({ default: true })
  active: boolean;
}
