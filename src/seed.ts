import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? '3306'),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASS ?? 'root1234',
  database: process.env.DB_NAME ?? 'bettrend',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function main() {
  await AppDataSource.initialize();
  const db = AppDataSource;

  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE positions');
  await db.query('TRUNCATE TABLE transactions');
  await db.query('DELETE FROM users WHERE id > 0');
  await db.query('ALTER TABLE users AUTO_INCREMENT = 1');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Tables nettoyees.');

  const hash = await bcrypt.hash('password123', 10);

  // -- Utilisateur Admin --
  const adminHash = await bcrypt.hash('admin@2026', 10);
  await db.query(
    `INSERT INTO users (name, email, phone, password, balance, referralCode, isAdmin)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Admin BetTrend', 'admin@bettrend.com', '+237600000000', adminHash, 0, 'BT-ADMN', true],
  );

  // -- Utilisateurs demo --
  const kamga = await db.query(
    `INSERT INTO users (name, email, phone, password, balance, referralCode, referredBy)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    ['Jean-Baptiste Kamga', 'kamga@bettrend.cm', '+237691234567', hash, 150000, 'BT-KBKM'],
  );
  const kamgaId: number = (kamga as any).insertId;

  const aicha = await db.query(
    `INSERT INTO users (name, email, phone, password, balance, referralCode, referredBy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Aicha Ngo Beti', 'aicha@bettrend.cm', '+237677889900', hash, 80000, 'BT-ANGB', kamgaId],
  );
  const aichaId: number = (aicha as any).insertId;

  const fatou = await db.query(
    `INSERT INTO users (name, email, phone, password, balance, referralCode, referredBy)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    ['Fatou Diallo', 'fatou@bettrend.cm', '+237655443322', hash, 250000, 'BT-FTDI'],
  );
  const fatouId: number = (fatou as any).insertId;

  const boris = await db.query(
    `INSERT INTO users (name, email, phone, password, balance, referralCode, referredBy)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    ['Boris Essomba', 'boris@bettrend.cm', '+237699887766', hash, 50000, 'BT-BRES'],
  );
  const borisId: number = (boris as any).insertId;

  console.log(`Utilisateurs crees : IDs ${kamgaId}, ${aichaId}, ${fatouId}, ${borisId}`);

  // -- Transactions demo --
  const txRows: [number, string, number, string, string][] = [
    [kamgaId, 'deposit', 200000, 'Depot Mobile Money', '2026-05-01 09:00:00'],
    [kamgaId, 'invest', 62000, 'Souscription 1XBET MaxPlus', '2026-05-02 10:00:00'],
    [kamgaId, 'yield', 16839, 'Revenu journalier 1XBET MaxPlus', '2026-05-03 00:00:00'],
    [kamgaId, 'yield', 16839, 'Revenu journalier 1XBET MaxPlus', '2026-05-04 00:00:00'],
    [kamgaId, 'referral', 30000, 'Bonus parrainage Aicha Ngo Beti', '2026-05-05 09:01:00'],

    [aichaId, 'deposit', 200000, 'Depot Mobile Money', '2026-05-05 09:00:00'],
    [aichaId, 'invest', 30000, 'Souscription 1XBET Max', '2026-05-06 11:00:00'],
    [aichaId, 'yield', 8148, 'Revenu journalier 1XBET Max', '2026-05-07 00:00:00'],

    [fatouId, 'deposit', 300000, 'Depot Mobile Money', '2026-06-01 08:00:00'],
    [fatouId, 'invest', 46000, 'Souscription BETWINNER MaxPlus', '2026-06-02 10:00:00'],
    [fatouId, 'invest', 72000, 'Souscription MELBET MaxPlus', '2026-06-02 10:05:00'],
    [fatouId, 'yield', 13386, 'Revenu journalier BETWINNER MaxPlus', '2026-06-03 00:00:00'],
    [fatouId, 'yield', 26539, 'Revenu journalier MELBET MaxPlus', '2026-06-03 00:00:00'],

    [borisId, 'deposit', 50000, 'Depot Mobile Money', '2026-07-01 11:00:00'],
  ];

  for (const [userId, type, amount, description, createdAt] of txRows) {
    await db.query(
      `INSERT INTO transactions (userId, type, amount, description, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [userId, type, amount, description, createdAt],
    );
  }
  console.log(`${txRows.length} transactions inserees.`);

  // -- Positions demo --
  const posRows: [number, number, string, string, number, number, number][] = [
    // [userId, planId, platform, planType, investedAmount, dailyRate, totalEarned]
    [kamgaId, 4, '1XBET', 'MaxPlus', 62000, 28, 33678],
    [aichaId, 3, '1XBET', 'Max', 30000, 28, 8148],
    [fatouId, 8, 'BETWINNER', 'MaxPlus', 46000, 30, 13386],
    [fatouId, 16, 'MELBET', 'MaxPlus', 72000, 38, 26539],
  ];

  for (const [userId, planId, platform, planType, investedAmount, dailyRate, totalEarned] of posRows) {
    await db.query(
      `INSERT INTO positions (userId, planId, platform, planType, investedAmount, dailyRatePercent, totalEarned, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, planId, platform, planType, investedAmount, dailyRate, totalEarned],
    );
  }
  console.log(`${posRows.length} positions inserees.`);

  console.log('\nComptes de demo :');
  console.log('  admin@bettrend.com — admin (mot de passe : admin@2026)');
  console.log('  kamga@bettrend.cm  — investisseur, parrain (mot de passe : password123)');
  console.log('  aicha@bettrend.cm  — investisseuse (mot de passe : password123)');
  console.log('  fatou@bettrend.cm  — multi-plateformes (mot de passe : password123)');
  console.log('  boris@bettrend.cm  — debutant (mot de passe : password123)');

  await AppDataSource.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
