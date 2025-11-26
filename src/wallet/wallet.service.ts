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
    return this.repo.save({ userId, balance: 0 });
  }

  async getBalance(userId: number) {
    const wallet = await this.repo.findOne({ where: { userId } });
    return wallet?.balance || 0;
  }

  async fund(userId: number, amount: number) {
    const wallet = await this.repo.findOne({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    wallet.balance += amount;
    await this.repo.save(wallet);
    await this.transactionService.log({
      type: 'fund',
      amount,
      toUserId: userId,
      description: 'Funded from mock source',
      walletId: wallet.id,
    });
  }

  async withdraw(userId: number, amount: number) {
    const wallet = await this.repo.findOne({ where: { userId } });
    if (!wallet || wallet.balance < amount) throw new BadRequestException('Insufficient balance');
    wallet.balance -= amount;
    await this.repo.save(wallet);
    await this.transactionService.log({
      type: 'withdraw',
      amount,
      fromUserId: userId,
      description: 'Withdrawal',
      walletId: wallet.id,
    });
  }

  async transfer(fromUserId: number, toUserId: number, amount: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: fromUserId } });
      const toWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: toUserId } });

      if (!fromWallet || !toWallet) throw new BadRequestException('User not found');
      if (fromWallet.balance < amount) throw new BadRequestException('Insufficient balance');

      fromWallet.balance -= amount;
      toWallet.balance += amount;

      await queryRunner.manager.save(Wallet, [fromWallet, toWallet]);

      const transaction = await this.transactionService.log({
        type: 'transfer',
        amount,
        fromUserId,
        toUserId,
        description: `Transfer to user ${toUserId}`,
        walletId: fromWallet.id,
      }, queryRunner.manager);

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