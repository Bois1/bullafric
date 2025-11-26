import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/wallet.entity';

export type TransactionType = 'fund' | 'transfer' | 'withdraw';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['fund', 'transfer', 'withdraw'] })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  fromUserId: number;

  @Column({ nullable: true })
  toUserId: number;

  @Column()
  description: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  fromUser: User;

  @ManyToOne(() => User, { nullable: true })
  toUser: User;

  @ManyToOne(() => Wallet)
  wallet: Wallet;
}