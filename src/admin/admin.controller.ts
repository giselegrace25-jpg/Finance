import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { DepositsService } from '../deposits/deposits.service';
import { WithdrawalRequestsService } from '../withdrawal-requests/withdrawal-requests.service';
import { WithdrawalAccountsService } from '../withdrawal-accounts/withdrawal-accounts.service';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private svc: AdminService,
    private depositsSvc: DepositsService,
    private withdrawalSvc: WithdrawalRequestsService,
    private withdrawalAccountSvc: WithdrawalAccountsService,
  ) {}

  // ─── DASHBOARD & ANALYTICS ─────────────────────────────────

  @Get('dashboard')
  dashboard() { return this.svc.getDashboard(); }

  @Get('analytics')
  analytics() { return this.svc.getFinancialAnalytics(); }

  @Get('analytics/advanced')
  advancedAnalytics() { return this.svc.getAdvancedAnalytics(); }

  // ─── SETTINGS ──────────────────────────────────────────────

  @Get('settings')
  getSettings() { return this.svc.getSettings(); }

  @Put('settings')
  updateSettings(@Body() body: Record<string, string>) { return this.svc.updateSettings(body); }

  // ─── TRIGGER YIELD MANUEL ──────────────────────────────────

  @Post('yield/trigger')
  triggerYield() { return this.svc.triggerYield(); }

  // ─── REFERRALS ─────────────────────────────────────────────

  @Get('referrals')
  referrals() { return this.svc.getReferralTree(); }

  // ─── EXPORT CSV ────────────────────────────────────────────

  @Get('export/users')
  async exportUsers(@Res() res: Response) {
    const csv = await this.svc.exportUsers();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  }

  @Get('export/transactions')
  async exportTransactions(@Res() res: Response) {
    const csv = await this.svc.exportTransactions();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  }

  // ─── DEPOSITS (validation) ─────────────────────────────────

  @Get('deposits')
  deposits(@Query('status') status?: string) { return this.svc.getDeposits(status); }

  @Get('deposits/pending')
  pendingDeposits() { return this.svc.getPendingDeposits(); }

  @Post('deposits/:id/approve')
  approveDeposit(@Param('id', ParseIntPipe) id: number, @Body() body: { note?: string }) {
    return this.depositsSvc.approve(id, body.note);
  }

  @Post('deposits/:id/reject')
  rejectDeposit(@Param('id', ParseIntPipe) id: number, @Body() body: { note?: string }) {
    return this.depositsSvc.reject(id, body.note);
  }

  // ─── USERS CRUD ────────────────────────────────────────────

  @Get('users')
  users() { return this.svc.getUsers(); }

  @Get('users/:id')
  userDetail(@Param('id', ParseIntPipe) id: number) { return this.svc.getUserDetail(id); }

  @Post('users/:id/balance')
  adjustBalance(@Param('id', ParseIntPipe) id: number, @Body() body: { amount: number; reason: string }) {
    return this.svc.adjustBalance(id, body.amount, body.reason);
  }

  @Post('users/:id/ban')
  banUser(@Param('id', ParseIntPipe) id: number) { return this.svc.banUser(id); }

  @Post('users/:id/unban')
  unbanUser(@Param('id', ParseIntPipe) id: number) { return this.svc.unbanUser(id); }

  @Put('users/:id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() body: { name?: string; email?: string; phone?: string }) {
    return this.svc.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) { return this.svc.deleteUser(id); }

  // ─── TRANSACTIONS ──────────────────────────────────────────

  @Get('transactions')
  transactions(@Query('limit') limit?: string) {
    return this.svc.getTransactions(limit ? parseInt(limit) : 100);
  }

  // ─── PLANS CRUD ────────────────────────────────────────────

  @Get('plans')
  plans() { return this.svc.getPlans(); }

  @Post('plans')
  createPlan(@Body() body: { slug: string; platform: string; planType: string; amount: number; dailyRatePercent: number; monthDays: number }) {
    return this.svc.createPlan(body);
  }

  @Put('plans/:id')
  updatePlan(@Param('id', ParseIntPipe) id: number, @Body() body: { amount?: number; dailyRatePercent?: number; monthDays?: number; active?: boolean }) {
    return this.svc.updatePlan(id, body);
  }

  @Post('plans/:id/toggle')
  togglePlan(@Param('id', ParseIntPipe) id: number) { return this.svc.togglePlan(id); }

  @Delete('plans/:id')
  deletePlan(@Param('id', ParseIntPipe) id: number) { return this.svc.deletePlan(id); }

  // ─── POSITIONS ─────────────────────────────────────────────

  @Get('positions')
  positions(@Query('active') active?: string) {
    return this.svc.getPositions(active !== 'false');
  }

  @Post('positions/:id/deactivate')
  deactivatePosition(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deactivatePosition(id);
  }

  // ─── WITHDRAWAL REQUESTS ───────────────────────────────────

  @Get('withdrawals')
  getWithdrawals(@Query('status') status?: string) {
    return this.withdrawalSvc.getAll(status);
  }

  @Post('withdrawals/:id/complete')
  completeWithdrawal(@Param('id', ParseIntPipe) id: number, @Body() body: { note?: string }) {
    return this.withdrawalSvc.complete(id, body.note);
  }

  @Post('withdrawals/:id/reject')
  rejectWithdrawal(@Param('id', ParseIntPipe) id: number, @Body() body: { note?: string }) {
    return this.withdrawalSvc.reject(id, body.note);
  }

  // ─── WITHDRAWAL ACCOUNTS ───────────────────────────────────

  @Post('withdrawal-accounts/:userId/unlock')
  unlockWithdrawalAccount(@Param('userId', ParseIntPipe) userId: number) {
    return this.withdrawalAccountSvc.adminUnlock(userId);
  }

  @Put('withdrawal-accounts/:userId')
  updateWithdrawalAccount(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { accountNumber: string; accountName: string },
  ) {
    return this.withdrawalAccountSvc.adminUpdate(userId, body.accountNumber, body.accountName);
  }
}
