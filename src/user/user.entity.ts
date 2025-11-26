import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Wallet } from '../wallet/wallet.entity';
import { Transaction } from '../transaction/transaction.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Wallet, wallet => wallet.user)
  wallet: Wallet;

  @OneToMany(() => Transaction, transaction => transaction.fromUser)
  sentTransactions: Transaction[];

  @OneToMany(() => Transaction, transaction => transaction.toUser)
  receivedTransactions: Transaction[];
}