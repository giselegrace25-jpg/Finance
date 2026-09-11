import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Position } from '../positions/position.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column()
  password: string;

  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @Column({ unique: true })
  referralCode: string;

  @Column({ nullable: true })
  referredBy: number;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  banned: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Transaction, (t) => t.user)
  transactions: Transaction[];

  @OneToMany(() => Position, (p) => p.user)
  positions: Position[];
}
