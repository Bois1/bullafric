import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Transaction, TransactionType } from './transaction.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private repo: Repository<Transaction>,
  ) {}

  async log(
    data: {
      type: TransactionType;
      amount: number;
      fromUserId?: number;
      toUserId?: number;
      description: string;
      walletId: number;
    },
    manager?: EntityManager,
  ) {
    const transaction = this.repo.create({
      ...data,
    });
    if (manager) {
      return manager.save(transaction);
    }
    return this.repo.save(transaction);
  }

  findByUserId(userId: number) {
    return this.repo
      .createQueryBuilder('t')
      .where('t.fromUserId = :id OR t.toUserId = :id', { id: userId })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }
}