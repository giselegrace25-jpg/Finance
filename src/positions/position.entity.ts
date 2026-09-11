import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (u) => u.positions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  planId: number;

  @Column()
  platform: string;

  @Column()
  planType: string;

  @Column({ type: 'bigint' })
  investedAmount: number;

  @Column({ type: 'float' })
  dailyRatePercent: number;

  @Column({ type: 'bigint', default: 0 })
  totalEarned: number;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastYieldAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
