import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private txService: TransactionsService) {}

  @Get()
  getHistory(@Request() req) {
    return this.txService.getHistory(req.user.userId);
  }
}
