import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionType } from '../transaction/transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private repo: Repository<Wallet>,
    private transactionService: TransactionService,
    private dataSource: DataSource,
  ) {}

  async create(userId: number) {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.repo.save({ userId, balance: 0 });
  }

  async getBalance(userId: number) {
    const wallet = await this.repo.findOne({ where: { userId } });
    if (!wallet) return 0;
    return typeof wallet.balance === 'string'
      ? parseFloat(wallet.balance)
      : wallet.balance;
  }

  private parseAmount(input: unknown): number {
    if (typeof input === 'string') {
      const parsed = parseFloat(input);
      if (isNaN(parsed)) throw new BadRequestException('Invalid amount format');
      return parsed;
    }
    if (typeof input === 'number') {
      return input;
    }
    throw new BadRequestException('Amount must be a number or numeric string');
  }

  async fund(userId: number, amount: unknown) {
    const numAmount = this.parseAmount(amount);
    if (numAmount <= 0) throw new BadRequestException('Amount must be positive');
    const safeAmount = Number(numAmount.toFixed(2));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const currentBalance = typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;

      const newBalance = Number((currentBalance + safeAmount).toFixed(2));
      wallet.balance = newBalance;

      await queryRunner.manager.save(wallet);

      await this.transactionService.log(
        {
          type: 'fund' as TransactionType,
          amount: safeAmount,
          toUserId: userId,
          description: 'Funded from mock source',
          walletId: wallet.id,
        },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async withdraw(userId: number, amount: unknown) {
    const numAmount = this.parseAmount(amount);
    if (numAmount <= 0) throw new BadRequestException('Amount must be positive');
    const safeAmount = Number(numAmount.toFixed(2));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const currentBalance = typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;

      if (currentBalance < safeAmount) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = Number((currentBalance - safeAmount).toFixed(2));
      wallet.balance = newBalance;

      await queryRunner.manager.save(wallet);

      await this.transactionService.log(
        {
          type: 'withdraw' as TransactionType,
          amount: safeAmount,
          fromUserId: userId,
          description: 'Withdrawal',
          walletId: wallet.id,
        },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async transfer(fromUserId: number, toUserId: number, amount: unknown) {
    if (fromUserId === toUserId) throw new BadRequestException('Cannot transfer to self');

    const numAmount = this.parseAmount(amount);
    if (numAmount <= 0) throw new BadRequestException('Amount must be positive');
    const safeAmount = Number(numAmount.toFixed(2));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromWallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: fromUserId },
        lock: { mode: 'pessimistic_write' },
      });
      const toWallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: toUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromWallet || !toWallet) throw new BadRequestException('User not found');

      const fromBalance = typeof fromWallet.balance === 'string'
        ? parseFloat(fromWallet.balance)
        : fromWallet.balance;

      if (fromBalance < safeAmount) throw new BadRequestException('Insufficient balance');

      const newFromBalance = Number((fromBalance - safeAmount).toFixed(2));
      const newToBalance = Number((parseFloat(toWallet.balance.toString()) + safeAmount).toFixed(2));

      fromWallet.balance = newFromBalance;
      toWallet.balance = newToBalance;

      await queryRunner.manager.save(Wallet, [fromWallet, toWallet]);

      const transaction = await this.transactionService.log(
        {
          type: 'transfer' as TransactionType,
          amount: safeAmount,
          fromUserId,
          toUserId,
          description: `Transfer to user ${toUserId}`,
          walletId: fromWallet.id,
        },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      return transaction;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}