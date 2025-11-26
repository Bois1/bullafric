import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../user/user.entity';
import { Transaction } from '../transaction/transaction.entity';

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
  balance: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, user => user.wallet)
  user: User;

  @OneToMany(() => Transaction, transaction => transaction.wallet)
  transactions: Transaction[];
}