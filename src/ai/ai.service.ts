import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Position } from '../positions/position.entity';
import { Deposit } from '../deposits/deposit.entity';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

const COHERE_API_URL = 'https://api.cohere.com/v1/chat';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Position) private posRepo: Repository<Position>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
  ) {}

  // ─── Collecte toutes les métriques du dashboard ────────────

  async getDashboardSnapshot(): Promise<Record<string, any>> {
    const [
      totalUsers,
      activePositions,
      pendingDeposits,
      deposits,
      withdrawn,
      yieldPaid,
      fees,
      referralPaid,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.posRepo.count({ where: { active: true } }),
      this.depositRepo.count({ where: { status: 'pending' } }),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type='deposit'").getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type='withdraw'").getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type='yield'").getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type IN ('withdrawal_fee','maintenance_fee')").getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type='referral'").getRawOne(),
    ]);

    const totalDeposits = Number(deposits.v);
    const totalWithdrawn = Number(withdrawn.v);
    const totalYield = Number(yieldPaid.v);
    const totalFees = Number(fees.v);
    const totalReferral = Number(referralPaid.v);
    const poolCash = Math.max(0, totalDeposits - totalWithdrawn - totalYield - totalReferral + totalFees);
    const margin = totalFees - totalYield - totalReferral;

    // Flux 7 derniers jours
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const [weekDeposits, weekWithdrawn, weekYield] = await Promise.all([
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type='deposit' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type='withdraw' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(t.amount),0)', 'v').where("t.type='yield' AND t.createdAt >= :d", { d: weekAgo }).getRawOne(),
    ]);

    // Obligations journalières (yields à payer)
    const positions = await this.posRepo.find({ where: { active: true } });
    const dailyObligations = positions.reduce(
      (s, p) => s + Math.round(Number(p.investedAmount) * p.dailyRatePercent / 100),
      0
    );

    // Dépôts validés/rejetés cette semaine
    const depositStats = await this.depositRepo.createQueryBuilder('d')
      .select("SUM(CASE WHEN d.status='approved' THEN 1 ELSE 0 END)", 'approved')
      .addSelect("SUM(CASE WHEN d.status='rejected' THEN 1 ELSE 0 END)", 'rejected')
      .addSelect("SUM(CASE WHEN d.status='pending' THEN 1 ELSE 0 END)", 'pending')
      .addSelect('COUNT(*)', 'total')
      .getRawOne();

    return {
      totalUsers,
      activePositions,
      pendingDeposits,
      totalDeposits,
      totalWithdrawn,
      totalYield,
      totalFees,
      totalReferral,
      poolCash,
      margin,
      runwayDays: dailyObligations > 0 ? Math.floor(poolCash / dailyObligations) : null,
      dailyObligations,
      weeklyFlows: {
        deposits: Number(weekDeposits.v),
        withdrawn: Number(weekWithdrawn.v),
        yield: Number(weekYield.v),
      },
      depositValidation: {
        approved: Number(depositStats.approved || 0),
        rejected: Number(depositStats.rejected || 0),
        pending: Number(depositStats.pending || 0),
        total: Number(depositStats.total || 0),
      },
    };
  }

  // ─── Construit le preamble système ─────────────────────────

  private buildPreamble(snapshot: Record<string, any>): string {
    const fmt = (n: number) => Number(n).toLocaleString('fr-FR');

    return `Tu es BetTrend AI, l'assistant analytique de la plateforme d'investissement BetTrend.
Tu analyses les données financières en temps réel et tu fournis des rapports clairs à l'administrateur.

## DONNÉES ACTUELLES DE LA PLATEFORME

- **Utilisateurs inscrits** : ${snapshot.totalUsers}
- **Positions actives** (investissements en cours) : ${snapshot.activePositions}
- **Dépôts en attente de validation** : ${snapshot.pendingDeposits}

### Caisse
- Total déposé : **${fmt(snapshot.totalDeposits)} FCFA**
- Total retiré : **${fmt(snapshot.totalWithdrawn)} FCFA**
- Solde en caisse : **${fmt(snapshot.poolCash)} FCFA**
- Obligations journalières (yields à payer) : **${fmt(snapshot.dailyObligations)} FCFA/jour**
- Autonomie de la caisse : **${snapshot.runwayDays !== null ? snapshot.runwayDays + ' jours' : 'Illimitée'}**

### Gains et charges (cumulés)
- Frais perçus (retraits 20% + maintenance 3%) : **${fmt(snapshot.totalFees)} FCFA**
- Yields versés aux clients : **${fmt(snapshot.totalYield)} FCFA**
- Bonus parrainage versés : **${fmt(snapshot.totalReferral)} FCFA**
- Marge nette : **${snapshot.margin >= 0 ? '+' : ''}${fmt(snapshot.margin)} FCFA** ${snapshot.margin >= 0 ? '(beneficiaire)' : '(deficitaire)'}

### Flux des 7 derniers jours
- Dépôts entrants : ${fmt(snapshot.weeklyFlows.deposits)} FCFA
- Retraits sortants : ${fmt(snapshot.weeklyFlows.withdrawn)} FCFA
- Yields versés : ${fmt(snapshot.weeklyFlows.yield)} FCFA

### Validation des dépôts (global)
- Approuvés : ${snapshot.depositValidation.approved} / ${snapshot.depositValidation.total}
- Rejetés : ${snapshot.depositValidation.rejected}
- En attente : ${snapshot.depositValidation.pending}

## TON RÔLE

Tu analyses ces données et tu réponds aux questions de l'administrateur avec des analyses claires et concrètes.
Tu signales les risques (caisse trop faible, trop de dépôts en attente, marge négative, etc.).
Tu rédiges des rapports structurés en Markdown quand on te le demande.
Tu réponds TOUJOURS en français.
Sois direct, factuel, orienté décision. Pas de préambule inutile.`;
  }

  // ─── Appel Cohere (non-streaming) ──────────────────────────

  async chat(message: string, history: Array<{ role: string; content: string }> = []): Promise<string> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) throw new Error('COHERE_API_KEY non configurée dans .env');

    const snapshot = await this.getDashboardSnapshot();
    const preamble = this.buildPreamble(snapshot);

    const chatHistory = history.slice(-14).map(h => ({
      role: h.role === 'user' ? 'USER' : 'CHATBOT',
      message: h.content,
    }));

    const res = await axios.post(
      COHERE_API_URL,
      {
        model: 'command-r-08-2024',
        message,
        preamble,
        chat_history: chatHistory,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    return res.data.text || '';
  }

  // ─── Appel Cohere (streaming — retourne le stream axios) ───

  async chatStream(message: string, history: Array<{ role: string; content: string }> = []) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) throw new Error('COHERE_API_KEY non configurée dans .env');

    const snapshot = await this.getDashboardSnapshot();
    const preamble = this.buildPreamble(snapshot);

    const chatHistory = history.slice(-14).map(h => ({
      role: h.role === 'user' ? 'USER' : 'CHATBOT',
      message: h.content,
    }));

    const res = await axios.post(
      COHERE_API_URL,
      {
        model: 'command-r-08-2024',
        message,
        preamble,
        chat_history: chatHistory,
        temperature: 0.3,
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'identity',
        },
        responseType: 'stream',
        decompress: false,
        timeout: 0,
      }
    );

    return res.data;
  }

  // ─── Génère le rapport PDF hebdomadaire ───────────────────

  async generateWeeklyReport(): Promise<Buffer> {
    const apiKey = process.env.COHERE_API_KEY;
    const snapshot = await this.getDashboardSnapshot();
    const fmt = (n: number) => Number(n).toLocaleString('fr-FR');

    let aiAnalysis = '';
    if (apiKey) {
      try {
        aiAnalysis = await this.chat(
          `Génère un rapport hebdomadaire complet de la plateforme BetTrend.
          Analyse la santé financière, les risques, les points positifs, les actions recommandées.
          Structure le rapport avec des sections claires : Résumé Exécutif, Santé Financière, Flux de la Semaine, Risques Identifiés, Recommandations.
          Sois précis et actionnable.`,
          []
        );
      } catch {
        aiAnalysis = 'Analyse IA non disponible (vérifiez la clé COHERE_API_KEY).';
      }
    } else {
      aiAnalysis = 'Clé COHERE_API_KEY non configurée.';
    }

    // Génération PDF
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // En-tête
      doc.rect(0, 0, doc.page.width, 80).fill('#0C1222');
      doc.fillColor('#D4A843').fontSize(22).font('Helvetica-Bold').text('BetTrend', 50, 20);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica').text('Rapport Hebdomadaire de Performance', 50, 48);
      doc.fillColor('#8899AA').fontSize(9).text(`Généré le ${dateStr}`, 50, 62);
      doc.moveDown(3);

      const col2 = 310;
      const lineH = 22;

      // Métriques clés
      doc.fillColor('#1E56E3').fontSize(13).font('Helvetica-Bold').text('MÉTRIQUES CLÉS', 50, 100);
      doc.moveTo(50, 116).lineTo(545, 116).strokeColor('#E0E8FF').lineWidth(1).stroke();

      const metrics = [
        ['Utilisateurs inscrits', `${snapshot.totalUsers}`, 'Positions actives', `${snapshot.activePositions}`],
        ['Total déposé', `${fmt(snapshot.totalDeposits)} FCFA`, 'Total retiré', `${fmt(snapshot.totalWithdrawn)} FCFA`],
        ['Solde en caisse', `${fmt(snapshot.poolCash)} FCFA`, 'Marge nette', `${snapshot.margin >= 0 ? '+' : ''}${fmt(snapshot.margin)} FCFA`],
        ['Yields versés', `${fmt(snapshot.totalYield)} FCFA`, 'Frais perçus', `${fmt(snapshot.totalFees)} FCFA`],
        ['Obligations/jour', `${fmt(snapshot.dailyObligations)} FCFA`, 'Autonomie caisse', snapshot.runwayDays !== null ? `${snapshot.runwayDays} jours` : 'Illimitée'],
      ];

      let y = 125;
      metrics.forEach(([l1, v1, l2, v2]) => {
        doc.fillColor('#556677').fontSize(9).font('Helvetica').text(l1, 50, y);
        doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(v1, 50, y + 11);
        doc.fillColor('#556677').fontSize(9).font('Helvetica').text(l2, col2, y);
        doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(v2, col2, y + 11);
        y += lineH + 8;
      });

      // Flux semaine
      y += 10;
      doc.fillColor('#1E56E3').fontSize(13).font('Helvetica-Bold').text('FLUX DE LA SEMAINE', 50, y);
      doc.moveTo(50, y + 16).lineTo(545, y + 16).strokeColor('#E0E8FF').lineWidth(1).stroke();
      y += 25;

      const weekRows = [
        ['Dépôts entrants', `+${fmt(snapshot.weeklyFlows.deposits)} FCFA`, '#22C55E'],
        ['Retraits sortants', `-${fmt(snapshot.weeklyFlows.withdrawn)} FCFA`, '#EF4444'],
        ['Yields versés', `-${fmt(snapshot.weeklyFlows.yield)} FCFA`, '#F59E0B'],
      ];
      weekRows.forEach(([label, value, color]) => {
        doc.fillColor('#334455').fontSize(10).font('Helvetica').text(label as string, 50, y);
        doc.fillColor(color as string).fontSize(10).font('Helvetica-Bold').text(value as string, col2, y);
        y += lineH;
      });

      // Validation dépôts
      y += 10;
      doc.fillColor('#1E56E3').fontSize(13).font('Helvetica-Bold').text('VALIDATION DES DÉPÔTS', 50, y);
      doc.moveTo(50, y + 16).lineTo(545, y + 16).strokeColor('#E0E8FF').lineWidth(1).stroke();
      y += 25;

      const depRows = [
        ['Approuvés', `${snapshot.depositValidation.approved}`, '#22C55E'],
        ['Rejetés', `${snapshot.depositValidation.rejected}`, '#EF4444'],
        ['En attente', `${snapshot.depositValidation.pending}`, '#F59E0B'],
        ['Total soumis', `${snapshot.depositValidation.total}`, '#6B7280'],
      ];
      depRows.forEach(([label, value, color]) => {
        doc.fillColor('#334455').fontSize(10).font('Helvetica').text(label as string, 50, y);
        doc.fillColor(color as string).fontSize(10).font('Helvetica-Bold').text(value as string, col2, y);
        y += lineH;
      });

      // Analyse IA
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 60).fill('#0C1222');
      doc.fillColor('#D4A843').fontSize(16).font('Helvetica-Bold').text('ANALYSE IA — BetTrend Assistant', 50, 20);
      doc.fillColor('#8899AA').fontSize(9).font('Helvetica').text(`Powered by Cohere command-r · ${dateStr}`, 50, 44);

      doc.fillColor('#1a1a2e').fontSize(10).font('Helvetica').moveDown(3);

      // Nettoie le Markdown pour PDF et l'écrit ligne par ligne
      const lines = aiAnalysis
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/#{1,3}\s*/g, '')
        .replace(/\*(.*?)\*/g, '$1')
        .split('\n');

      let yAi = 90;
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) { yAi += 6; return; }
        const isHeader = line.match(/^#{1,3}\s/) || (trimmed.length < 60 && trimmed.endsWith(':'));
        if (yAi > doc.page.height - 80) { doc.addPage(); yAi = 50; }
        if (isHeader) {
          doc.fillColor('#1E56E3').fontSize(11).font('Helvetica-Bold').text(trimmed.replace(/^#+\s/, ''), 50, yAi);
          yAi += 16;
        } else {
          doc.fillColor('#222233').fontSize(9.5).font('Helvetica').text(trimmed, 50, yAi, { width: 495, lineGap: 2 });
          yAi += Math.ceil(trimmed.length / 80) * 13 + 4;
        }
      });

      // Pied de page
      doc.fillColor('#AABBCC').fontSize(8).text(
        `BetTrend — Rapport confidentiel · ${dateStr}`,
        50,
        doc.page.height - 40,
        { align: 'center', width: 495 }
      );

      doc.end();
    });
  }
}
