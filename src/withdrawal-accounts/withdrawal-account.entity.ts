import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('withdrawal_accounts')
export class WithdrawalAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  accountNumber: string;

  @Column()
  accountName: string;

  @Column({ default: true })
  isLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
