import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './wallet.entity';
import { WalletService } from './wallet.service';
import { TransactionModule } from '../transaction/transaction.module'
// import { WalletController } from './wallet.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet]), TransactionModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}