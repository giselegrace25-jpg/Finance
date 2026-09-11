import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type DepositStatus = 'pending' | 'approved' | 'rejected';

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ nullable: true })
  provider: string;

  @Column({ nullable: true })
  transactionId: string;

  @Column()
  proofUrl: string;

  @Column({ default: 'pending' })
  status: DepositStatus;

  @Column({ nullable: true })
  adminNote: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
