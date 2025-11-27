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

  async fund(userId: number, amount: number | string) {

  let parsedAmount: number;
  if (typeof amount === 'string') {
    parsedAmount = parseFloat(amount);

  } else if (typeof amount === 'number') {
    parsedAmount = amount;

  } else {
    throw new BadRequestException('Amount must be a number or numeric string');
  }

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new BadRequestException('Amount must be a positive number');
  }

  const safeAmount = Number(parsedAmount.toFixed(2));

  const wallet = await this.repo.findOne({ where: { userId } });
  if (!wallet) {
    
    throw new BadRequestException('Wallet not found');
  }

 
  const currentBalance = typeof wallet.balance === 'string' 
    ? parseFloat(wallet.balance) 
    : wallet.balance;


  const newBalanceRaw = currentBalance + safeAmount;
  const newBalance = Number(newBalanceRaw.toFixed(2));
 

  wallet.balance = newBalance;
  
  await this.repo.save(wallet);

  await this.transactionService.log({
    type: 'fund' as TransactionType,
    amount: safeAmount,
    toUserId: userId,
    description: 'Funded from mock source',
    walletId: wallet.id,
  });
  
}

  async withdraw(userId: number, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const safeAmount = Number(amount.toFixed(2)); 

    const wallet = await this.repo.findOne({ where: { userId } });
    if (!wallet || wallet.balance < safeAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    const newBalance = Number((wallet.balance - safeAmount).toFixed(2)); 
    wallet.balance = newBalance;
    await this.repo.save(wallet);

    await this.transactionService.log({
      type: 'withdraw' as TransactionType,
      amount: safeAmount,
      fromUserId: userId,
      description: 'Withdrawal',
      walletId: wallet.id,
    });
  }

  async transfer(fromUserId: number, toUserId: number, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (fromUserId === toUserId) throw new BadRequestException('Cannot transfer to self');
    const safeAmount = Number(amount.toFixed(2)); 

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: fromUserId } });
      const toWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: toUserId } });

      if (!fromWallet || !toWallet) throw new BadRequestException('User not found');
      if (fromWallet.balance < safeAmount) throw new BadRequestException('Insufficient balance');

     
      fromWallet.balance = Number((fromWallet.balance - safeAmount).toFixed(2));
      toWallet.balance = Number((toWallet.balance + safeAmount).toFixed(2));

      await queryRunner.manager.save(Wallet, [fromWallet, toWallet]);

      const transaction = await this.transactionService.log({
        type: 'transfer' as TransactionType,
        amount: safeAmount,
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