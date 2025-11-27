import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { TransactionService } from './transaction.service';

interface JwtPayload {
  userId: number;
  email: string;
}

@Controller('transaction')
@UseGuards(AuthGuard('jwt'))
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get('history')
  async getTransactionHistory(@Req() req: Request & { user: JwtPayload }) {
    const transactions = await this.transactionService.findByUserId(req.user.userId);
    return { transactions };
  }
}