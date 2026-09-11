import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WithdrawalAccountsService } from './withdrawal-accounts.service';

@Controller('withdrawal-accounts')
@UseGuards(JwtAuthGuard)
export class WithdrawalAccountsController {
  constructor(private svc: WithdrawalAccountsService) {}

  @Get('me')
  getMyAccount(@Request() req) {
    return this.svc.getMyAccount(req.user.userId);
  }

  @Post()
  createAccount(
    @Request() req,
    @Body('accountNumber') accountNumber: string,
    @Body('accountName') accountName: string,
  ) {
    return this.svc.create(req.user.userId, accountNumber, accountName);
  }
}
