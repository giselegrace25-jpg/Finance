import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Position } from '../positions/position.entity';
import { Plan } from '../campaigns/campaign.entity';
import { Deposit } from '../deposits/deposit.entity';
import { Setting } from '../common/setting.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Position) private posRepo: Repository<Position>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
    private dataSource: DataSource,
  ) {}

  // ─── DASHBOARD ────────────────────────────────────────────

  async getDashboard() {
    const [users, plans, positions] = await Promise.all([
      this.usersRepo.count(),
      this.planRepo.count(),
      this.posRepo.count({ where: { active: true } }),
    ]);

    const deposits = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'deposit'").getRawOne();
    const withdrawn = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdraw'").getRawOne();
    const yieldPaid = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'yield'").getRawOne();
    const fees = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type IN ('withdrawal_fee','maintenance_fee','game_fee')").getRawOne();
    const referralPaid = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'referral'").getRawOne();
    const txCount = await this.txRepo.count();
    const pendingDeposits = await this.depositRepo.count({ where: { status: 'pending' } });

    const totalDeposits = Number(deposits.v);
    const totalWithdrawn = Number(withdrawn.v);
    const totalYield = Number(yieldPaid.v);
    const totalFees = Number(fees.v);
    const totalReferral = Number(referralPaid.v);

    const poolCash = totalDeposits - totalWithdrawn - totalYield - totalReferral + totalFees;

    return {
      users, plans, activePositions: positions, txCount, pendingDeposits,
      totalDeposits, totalWithdrawn, totalYield, totalFees, totalReferral,
      poolCash: Math.max(0, poolCash),
    };
  }

  // ─── ANALYTICS FINANCIERES ─────────────────────────────────

  async getFinancialAnalytics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const [dailyIn, dailyOut, weeklyIn, weeklyOut, monthlyIn, monthlyOut] = await Promise.all([
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'deposit' AND t.createdAt >= :d", { d: today }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdraw' AND t.createdAt >= :d", { d: today }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'deposit' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdraw' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'deposit' AND t.createdAt >= :d", { d: monthAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdraw' AND t.createdAt >= :d", { d: monthAgo }).getRawOne(),
    ]);

    const [dailyYield, weeklyYield, monthlyYield] = await Promise.all([
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'yield' AND t.createdAt >= :d", { d: today }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'yield' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'yield' AND t.createdAt >= :d", { d: monthAgo }).getRawOne(),
    ]);

    const [dailyFees, weeklyFees, monthlyFees] = await Promise.all([
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type IN ('withdrawal_fee','maintenance_fee') AND t.createdAt >= :d", { d: today }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type IN ('withdrawal_fee','maintenance_fee') AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type IN ('withdrawal_fee','maintenance_fee') AND t.createdAt >= :d", { d: monthAgo }).getRawOne(),
    ]);

    const [dailyWithdrawalFees, weeklyWithdrawalFees, monthlyWithdrawalFees] = await Promise.all([
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdrawal_fee' AND t.createdAt >= :d", { d: today }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdrawal_fee' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdrawal_fee' AND t.createdAt >= :d", { d: monthAgo }).getRawOne(),
    ]);

    const [dailyMaintenanceFees, weeklyMaintenanceFees, monthlyMaintenanceFees] = await Promise.all([
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'maintenance_fee' AND t.createdAt >= :d", { d: today }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'maintenance_fee' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'maintenance_fee' AND t.createdAt >= :d", { d: monthAgo }).getRawOne(),
    ]);

    // Revenue par plateforme
    const revenueByPlatform = await this.posRepo
      .createQueryBuilder('p')
      .select('p.platform', 'platform')
      .addSelect('COUNT(*)', 'positions')
      .addSelect('COALESCE(SUM(p.investedAmount),0)', 'totalInvested')
      .addSelect('COALESCE(SUM(p.totalEarned),0)', 'totalEarned')
      .where('p.active = 1')
      .groupBy('p.platform')
      .getRawMany();

    return {
      flows: {
        daily: { deposits: Number(dailyIn.v), withdrawals: Number(dailyOut.v), net: Number(dailyIn.v) - Number(dailyOut.v) },
        weekly: { deposits: Number(weeklyIn.v), withdrawals: Number(weeklyOut.v), net: Number(weeklyIn.v) - Number(weeklyOut.v) },
        monthly: { deposits: Number(monthlyIn.v), withdrawals: Number(monthlyOut.v), net: Number(monthlyIn.v) - Number(monthlyOut.v) },
      },
      yields: {
        daily: Number(dailyYield.v),
        weekly: Number(weeklyYield.v),
        monthly: Number(monthlyYield.v),
      },
      platformRevenue: {
        withdrawalFees: { daily: Number(dailyWithdrawalFees.v), weekly: Number(weeklyWithdrawalFees.v), monthly: Number(monthlyWithdrawalFees.v) },
        maintenanceFees: { daily: Number(dailyMaintenanceFees.v), weekly: Number(weeklyMaintenanceFees.v), monthly: Number(monthlyMaintenanceFees.v) },
        total: { daily: Number(dailyFees.v), weekly: Number(weeklyFees.v), monthly: Number(monthlyFees.v) },
      },
      byPlatform: revenueByPlatform.map(r => ({
        platform: r.platform,
        positions: Number(r.positions),
        totalInvested: Number(r.totalInvested),
        totalEarned: Number(r.totalEarned),
      })),
    };
  }

  // ─── ANALYTICS AVANCEES ─────────────────────────────────────

  async getAdvancedAnalytics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Croissance utilisateurs (7 derniers jours + 30 derniers jours)
    const userGrowth: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const nextDay = new Date(day.getTime() + 86400000);
      const count = await this.usersRepo.createQueryBuilder('u')
        .where('u.createdAt >= :d AND u.createdAt < :nd', { d: day, nd: nextDay })
        .getCount();
      userGrowth.push({ date: day.toISOString().slice(0, 10), count });
    }

    // Tendance des depots (30 jours)
    const depositTrend: { date: string; total: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const nextDay = new Date(day.getTime() + 86400000);
      const r = await this.txRepo.createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount),0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where("t.type = 'deposit' AND t.createdAt >= :d AND t.createdAt < :nd", { d: day, nd: nextDay })
        .getRawOne();
      depositTrend.push({ date: day.toISOString().slice(0, 10), total: Number(r.total), count: Number(r.count) });
    }

    // Tendance des retraits (30 jours)
    const withdrawTrend: { date: string; total: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const nextDay = new Date(day.getTime() + 86400000);
      const r = await this.txRepo.createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount),0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where("t.type = 'withdraw' AND t.createdAt >= :d AND t.createdAt < :nd", { d: day, nd: nextDay })
        .getRawOne();
      withdrawTrend.push({ date: day.toISOString().slice(0, 10), total: Number(r.total), count: Number(r.count) });
    }

    // Gains plateforme par jour (frais perçus - 30 jours)
    const revenueTrend: { date: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const nextDay = new Date(day.getTime() + 86400000);
      const r = await this.txRepo.createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount),0)', 'total')
        .where("t.type IN ('withdrawal_fee','maintenance_fee') AND t.createdAt >= :d AND t.createdAt < :nd", { d: day, nd: nextDay })
        .getRawOne();
      revenueTrend.push({ date: day.toISOString().slice(0, 10), total: Number(r.total) });
    }

    // Top 10 parrains (ceux qui rapportent le plus d'utilisateurs)
    const topReferrers = await this.usersRepo.createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.referralCode', 'referralCode')
      .addSelect('COUNT(r.id)', 'filleuls')
      .leftJoin(User, 'r', 'r.referredBy = u.id')
      .groupBy('u.id')
      .having('COUNT(r.id) > 0')
      .orderBy('COUNT(r.id)', 'DESC')
      .limit(10)
      .getRawMany();

    // Top 10 investisseurs (plus gros capital actif)
    const topInvestors = await this.posRepo.createQueryBuilder('p')
      .select('p.userId', 'userId')
      .addSelect('u.name', 'name')
      .addSelect('SUM(p.investedAmount)', 'totalInvested')
      .addSelect('COUNT(p.id)', 'positions')
      .addSelect('SUM(p.totalEarned)', 'totalEarned')
      .leftJoin(User, 'u', 'u.id = p.userId')
      .where('p.active = 1')
      .groupBy('p.userId')
      .orderBy('SUM(p.investedAmount)', 'DESC')
      .limit(10)
      .getRawMany();

    // Performance des plans (quels plans attirent le plus)
    const planPerformance = await this.posRepo.createQueryBuilder('p')
      .select('pl.slug', 'slug')
      .addSelect('pl.platform', 'platform')
      .addSelect('pl.planType', 'planType')
      .addSelect('pl.amount', 'planAmount')
      .addSelect('COUNT(p.id)', 'totalPositions')
      .addSelect('SUM(CASE WHEN p.active = 1 THEN 1 ELSE 0 END)', 'activePositions')
      .addSelect('COALESCE(SUM(p.investedAmount),0)', 'totalInvested')
      .addSelect('COALESCE(SUM(p.totalEarned),0)', 'totalYieldPaid')
      .leftJoin(Plan, 'pl', 'pl.id = p.planId')
      .groupBy('p.planId')
      .orderBy('COUNT(p.id)', 'DESC')
      .getRawMany();

    // Risque de la plateforme : ratio yields payes vs depots recus
    const totalDeposited = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'deposit'").getRawOne();
    const totalYieldPaid = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'yield'").getRawOne();
    const totalWithdrawnR = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'withdraw'").getRawOne();
    const totalBonusPaid = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type = 'referral'").getRawOne();
    const totalFeesEarned = await this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type IN ('withdrawal_fee','maintenance_fee','game_fee')").getRawOne();

    const dep = Number(totalDeposited.v);
    const yld = Number(totalYieldPaid.v);
    const wth = Number(totalWithdrawnR.v);
    const bon = Number(totalBonusPaid.v);
    const fee = Number(totalFeesEarned.v);

    // Obligations futures (combien de yields tu dois encore payer sur les positions actives)
    const activePositions = await this.posRepo.find({ where: { active: true } });
    const dailyObligations = activePositions.reduce((sum, p) => sum + Math.round(Number(p.investedAmount) * p.dailyRatePercent / 100), 0);
    const monthlyObligations = dailyObligations * 30;

    // Delai moyen de validation des depots
    const avgValidation = await this.depositRepo.createQueryBuilder('d')
      .select('AVG(TIMESTAMPDIFF(MINUTE, d.createdAt, d.reviewedAt))', 'avgMinutes')
      .where("d.status = 'approved' AND d.reviewedAt IS NOT NULL")
      .getRawOne();

    // Taux de conversion (utilisateurs qui ont au moins 1 position active)
    const totalUsers = await this.usersRepo.count();
    const investingUsers = await this.posRepo.createQueryBuilder('p')
      .select('COUNT(DISTINCT p.userId)', 'count')
      .where('p.active = 1')
      .getRawOne();

    // Depots rejetes vs approuves
    const depositStats = await this.depositRepo.createQueryBuilder('d')
      .select("SUM(CASE WHEN d.status = 'approved' THEN 1 ELSE 0 END)", 'approved')
      .addSelect("SUM(CASE WHEN d.status = 'rejected' THEN 1 ELSE 0 END)", 'rejected')
      .addSelect("SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END)", 'pending')
      .addSelect('COUNT(*)', 'total')
      .getRawOne();

    return {
      userGrowth,
      depositTrend,
      withdrawTrend,
      revenueTrend,
      topReferrers: topReferrers.map(r => ({ id: Number(r.id), name: r.name, referralCode: r.referralCode, filleuls: Number(r.filleuls) })),
      topInvestors: topInvestors.map(r => ({ userId: Number(r.userId), name: r.name, totalInvested: Number(r.totalInvested), positions: Number(r.positions), totalEarned: Number(r.totalEarned) })),
      planPerformance: planPerformance.map(r => ({ slug: r.slug, platform: r.platform, planType: r.planType, planAmount: Number(r.planAmount), totalPositions: Number(r.totalPositions), activePositions: Number(r.activePositions), totalInvested: Number(r.totalInvested), totalYieldPaid: Number(r.totalYieldPaid) })),
      riskMetrics: {
        totalDeposited: dep,
        totalYieldPaid: yld,
        totalWithdrawn: wth,
        totalBonusPaid: bon,
        totalFeesEarned: fee,
        poolBalance: dep - wth - yld - bon + fee,
        yieldToDepositRatio: dep > 0 ? Math.round(yld / dep * 10000) / 100 : 0,
        dailyObligations,
        monthlyObligations,
        runwayDays: dailyObligations > 0 ? Math.floor((dep - wth - yld - bon + fee) / dailyObligations) : Infinity,
      },
      conversionRate: {
        totalUsers,
        investingUsers: Number(investingUsers.count),
        percent: totalUsers > 0 ? Math.round(Number(investingUsers.count) / totalUsers * 10000) / 100 : 0,
      },
      depositValidation: {
        approved: Number(depositStats.approved || 0),
        rejected: Number(depositStats.rejected || 0),
        pending: Number(depositStats.pending || 0),
        total: Number(depositStats.total || 0),
        approvalRate: Number(depositStats.total) > 0 ? Math.round(Number(depositStats.approved || 0) / Number(depositStats.total) * 10000) / 100 : 0,
        avgValidationMinutes: avgValidation?.avgMinutes ? Math.round(Number(avgValidation.avgMinutes)) : null,
      },
    };
  }

  // ─── DEPOSITS (validation) ─────────────────────────────────

  getPendingDeposits() {
    return this.depositRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      relations: { user: true },
    });
  }

  getDeposits(status?: string) {
    const where = status ? { status: status as any } : {};
    return this.depositRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { user: true },
      take: 200,
    });
  }

  // ─── USERS CRUD ────────────────────────────────────────────

  getUsers() {
    return this.usersRepo.find({
      order: { createdAt: 'DESC' },
      select: { id: true, name: true, email: true, phone: true, balance: true, referralCode: true, referredBy: true, isAdmin: true, banned: true, createdAt: true },
    });
  }

  async getUserDetail(id: number) {
    const user = await this.usersRepo.findOneOrFail({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, balance: true, referralCode: true, referredBy: true, isAdmin: true, createdAt: true },
    });
    const transactions = await this.txRepo.find({ where: { userId: id }, order: { createdAt: 'DESC' }, take: 50 });
    const positions = await this.posRepo.find({ where: { userId: id } });
    const deposits = await this.depositRepo.find({ where: { userId: id }, order: { createdAt: 'DESC' }, take: 20 });
    return { user, transactions, positions, deposits };
  }

  async adjustBalance(id: number, amount: number, reason: string) {
    if (!reason) throw new BadRequestException('La raison est requise.');
    await this.dataSource.transaction(async (em) => {
      await em.increment(User, { id }, 'balance', amount);
      await em.save(em.create(Transaction, {
        userId: id, type: amount > 0 ? 'deposit' : 'withdraw',
        amount: Math.abs(amount), description: `[Admin] ${reason}`,
      }));
    });
    return this.usersRepo.findOneOrFail({ where: { id }, select: { id: true, name: true, balance: true } });
  }

  async updateUser(id: number, data: { name?: string; email?: string; phone?: string }) {
    await this.usersRepo.findOneByOrFail({ id });
    const updateData: Record<string, string> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    await this.usersRepo.update({ id }, updateData);
    return this.usersRepo.findOneOrFail({ where: { id }, select: { id: true, name: true, email: true, phone: true, balance: true } });
  }

  async deleteUser(id: number) {
    await this.depositRepo.delete({ userId: id });
    await this.txRepo.delete({ userId: id });
    await this.posRepo.delete({ userId: id });
    await this.usersRepo.delete({ id });
    return { ok: true };
  }

  // ─── TRANSACTIONS ──────────────────────────────────────────

  getTransactions(limit = 100) {
    return this.txRepo.find({ order: { createdAt: 'DESC' }, take: limit, relations: { user: true } });
  }

  // ─── PLANS CRUD ────────────────────────────────────────────

  getPlans() {
    return this.planRepo.find({ order: { platform: 'ASC', amount: 'ASC' } });
  }

  async createPlan(data: { slug: string; platform: string; planType: string; amount: number; dailyRatePercent: number; monthDays: number }) {
    const existing = await this.planRepo.findOneBy({ slug: data.slug });
    if (existing) throw new BadRequestException('Ce slug existe deja.');
    const dailyRevenue = Math.round(data.amount * data.dailyRatePercent / 100);
    const monthlyRevenue = dailyRevenue * data.monthDays;
    const daysToRecover = Math.ceil(data.amount / dailyRevenue);
    const plan = this.planRepo.create({
      slug: data.slug,
      platform: data.platform as any,
      planType: data.planType as any,
      amount: data.amount,
      dailyRatePercent: data.dailyRatePercent,
      monthDays: data.monthDays,
      dailyRevenue,
      monthlyRevenue,
      daysToRecover,
      active: true,
    });
    return this.planRepo.save(plan);
  }

  async updatePlan(id: number, data: { amount?: number; dailyRatePercent?: number; monthDays?: number; active?: boolean }) {
    const plan = await this.planRepo.findOneByOrFail({ id });
    const amount = data.amount ?? plan.amount;
    const rate = data.dailyRatePercent ?? plan.dailyRatePercent;
    const days = data.monthDays ?? plan.monthDays;
    const dailyRevenue = Math.round(Number(amount) * rate / 100);
    const monthlyRevenue = dailyRevenue * days;
    const daysToRecover = Math.ceil(Number(amount) / dailyRevenue);
    await this.planRepo.update({ id }, { ...data, dailyRevenue, monthlyRevenue, daysToRecover });
    return this.planRepo.findOneByOrFail({ id });
  }

  async togglePlan(id: number) {
    const p = await this.planRepo.findOneByOrFail({ id });
    await this.planRepo.update({ id }, { active: !p.active });
    return { id, active: !p.active };
  }

  async deletePlan(id: number) {
    const positions = await this.posRepo.count({ where: { planId: id, active: true } });
    if (positions > 0) throw new BadRequestException('Ce plan a des positions actives.');
    await this.planRepo.delete({ id });
    return { ok: true };
  }

  // ─── POSITIONS ─────────────────────────────────────────────

  getPositions(activeOnly = true) {
    const where = activeOnly ? { active: true } : {};
    return this.posRepo.find({ where, order: { createdAt: 'DESC' }, relations: { user: true }, take: 200 });
  }

  async deactivatePosition(id: number) {
    await this.posRepo.update({ id }, { active: false });
    return { ok: true };
  }

  // ─── BANNIR / DEBANNIR ─────────────────────────────────────

  async banUser(id: number) {
    await this.usersRepo.findOneByOrFail({ id });
    await this.usersRepo.update({ id }, { banned: true });
    return { ok: true, banned: true };
  }

  async unbanUser(id: number) {
    await this.usersRepo.findOneByOrFail({ id });
    await this.usersRepo.update({ id }, { banned: false });
    return { ok: true, banned: false };
  }

  // ─── PARAMETRES CONFIGURABLES ──────────────────────────────

  async getSettings() {
    const rows = await this.settingRepo.find();
    const defaults: Record<string, string> = {
      withdrawal_fee_percent: '20',
      maintenance_fee_percent: '3',
      referral_bonus_percent: '15',
      min_withdrawal: '2000',
      withdrawals_enabled: 'true',
      deposit_phone_mtn: '',
      deposit_phone_orange: '',
    };
    const map: Record<string, string> = { ...defaults };
    for (const r of rows) map[r.key] = r.value;
    return map;
  }

  async updateSettings(data: Record<string, string>) {
    for (const [key, value] of Object.entries(data)) {
      const existing = await this.settingRepo.findOneBy({ key });
      if (existing) {
        await this.settingRepo.update({ key }, { value });
      } else {
        await this.settingRepo.save(this.settingRepo.create({ key, value }));
      }
    }
    return this.getSettings();
  }

  // ─── CRON YIELD MANUEL ─────────────────────────────────────

  async triggerYield() {
    const positions = await this.posRepo.find({ where: { active: true } });
    const settings = await this.getSettings();
    const maintenancePercent = Number(settings.maintenance_fee_percent) / 100;
    let totalPaid = 0;
    let count = 0;
    const now = new Date();

    for (const pos of positions) {
      const lastPaidAt = pos.lastYieldAt ? new Date(pos.lastYieldAt) : null;
      const baseDate = lastPaidAt ?? new Date(pos.createdAt);
      const yieldDue = now.getTime() - baseDate.getTime() >= 24 * 60 * 60 * 1000;
      if (!yieldDue) continue;

      const grossGain = Math.round(Number(pos.investedAmount) * (pos.dailyRatePercent / 100));
      const maintenanceFee = Math.round(grossGain * maintenancePercent);
      const netGain = grossGain - maintenanceFee;
      if (netGain <= 0) continue;

      await this.dataSource.transaction(async (em) => {
        await em.increment(User, { id: pos.userId }, 'balance', netGain);
        await em.update(Position, { id: pos.id }, { totalEarned: Number(pos.totalEarned) + netGain, lastYieldAt: now });
        await em.save(em.create(Transaction, {
          userId: pos.userId, type: 'yield', amount: netGain,
          description: `Revenu journalier ${pos.platform} ${pos.planType} [Manuel]`,
        }));
        if (maintenanceFee > 0) {
          await em.save(em.create(Transaction, {
            userId: pos.userId, type: 'maintenance_fee', amount: maintenanceFee,
            description: `Frais maintenance ${settings.maintenance_fee_percent}% - ${pos.platform}`,
          }));
        }
      });
      totalPaid += netGain;
      count++;
    }
    return { ok: true, positionsPaid: count, totalPaid };
  }

  // ─── VUE PARRAINAGES ───────────────────────────────────────

  async getReferralTree() {
    const users = await this.usersRepo.find({
      select: { id: true, name: true, referralCode: true, referredBy: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });

    const referrals: { sponsor: { id: number; name: string; code: string }; filleuls: { id: number; name: string; date: string }[] }[] = [];

    const sponsors = users.filter(u => users.some(f => f.referredBy === u.id));
    for (const s of sponsors) {
      const filleuls = users.filter(u => u.referredBy === s.id).map(u => ({ id: u.id, name: u.name, date: u.createdAt.toString() }));
      referrals.push({ sponsor: { id: s.id, name: s.name, code: s.referralCode }, filleuls });
    }
    return referrals.sort((a, b) => b.filleuls.length - a.filleuls.length);
  }

  // ─── EXPORT CSV ────────────────────────────────────────────

  async exportUsers() {
    const users = await this.usersRepo.find({ order: { createdAt: 'DESC' } });
    const header = 'ID,Nom,Email,Telephone,Solde,Code parrainage,Parraine par,Banni,Inscrit le';
    const rows = users.map(u => `${u.id},"${u.name}","${u.email}","${u.phone}",${u.balance},${u.referralCode},${u.referredBy || ''},${u.banned ? 'oui' : 'non'},${u.createdAt}`);
    return [header, ...rows].join('\n');
  }

  async exportTransactions() {
    const txs = await this.txRepo.find({ order: { createdAt: 'DESC' }, take: 5000, relations: { user: true } });
    const header = 'ID,User,Type,Montant,Description,Date';
    const rows = txs.map(t => `${t.id},"${t.user?.name || t.userId}",${t.type},${t.amount},"${t.description || ''}",${t.createdAt}`);
    return [header, ...rows].join('\n');
  }
}
