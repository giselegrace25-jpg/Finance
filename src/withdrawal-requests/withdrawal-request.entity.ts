import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type WithdrawalStatus = 'pending' | 'completed' | 'rejected';

@Entity('withdrawal_requests')
export class WithdrawalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'bigint' })
  netAmount: number;

  @Column({ type: 'bigint' })
  fee: number;

  @Column()
  accountNumber: string;

  @Column()
  accountName: string;

  @Column({ default: 'pending' })
  status: WithdrawalStatus;

  @Column({ nullable: true })
  adminNote: string;

  @Column({ nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
