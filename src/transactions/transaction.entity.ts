import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type TxType = 'deposit' | 'withdraw' | 'invest' | 'yield' | 'referral' | 'game_win' | 'game_fee' | 'maintenance_fee' | 'withdrawal_fee';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (u) => u.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  type: TxType;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
