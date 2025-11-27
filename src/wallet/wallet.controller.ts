import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { WalletService } from './wallet.service';


interface JwtPayload {
  userId: number;
  email: string;
}

@Controller('wallet')
@UseGuards(AuthGuard('jwt'))
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Req() req: Request & { user: JwtPayload }) {
    const balance = await this.walletService.getBalance(req.user.userId);
    return { balance };
  }

  @Post('fund')
  async fund(@Req() req: Request & { user: JwtPayload }, @Body('amount') amount: number) {
    await this.walletService.fund(req.user.userId, amount);
    return { message: 'Funded successfully' };
  }

  @Post('withdraw')
  async withdraw(@Req() req: Request & { user: JwtPayload }, @Body('amount') amount: number) {
    await this.walletService.withdraw(req.user.userId, amount);
    return { message: 'Withdrawal processed' };
  }

  @Post('transfer')
  async transfer(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: { toUserId: number; amount: number },
  ) {
    await this.walletService.transfer(req.user.userId, body.toUserId, body.amount);
    return { message: 'Transfer successful' };
  }
}

