import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WithdrawalRequestsService } from './withdrawal-requests.service';

@Controller('withdrawal-requests')
@UseGuards(JwtAuthGuard)
export class WithdrawalRequestsController {
  constructor(private svc: WithdrawalRequestsService) {}

  @Post()
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  createRequest(@Request() req, @Body('amount') amount: number) {
    return this.svc.createRequest(req.user.userId, Number(amount));
  }

  @Get('my')
  getMyRequests(@Request() req) {
    return this.svc.getMyRequests(req.user.userId);
  }
}
