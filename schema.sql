-- BetTrend — Schema de base de données
-- Importer ce fichier dans MySQL pour initialiser une BD vide fonctionnelle :
--   mysql -u root -p bettrend < schema.sql

CREATE DATABASE IF NOT EXISTS bettrend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bettrend;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  balance BIGINT DEFAULT 0,
  referralCode VARCHAR(255) NOT NULL UNIQUE,
  referredBy INT NULL,
  isAdmin TINYINT(1) DEFAULT 0,
  banned TINYINT(1) DEFAULT 0,
  createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(255) NOT NULL,
  planType VARCHAR(255) NOT NULL,
  amount BIGINT NOT NULL,
  dailyRatePercent FLOAT NOT NULL,
  dailyRevenue BIGINT NOT NULL,
  monthlyRevenue BIGINT NOT NULL,
  monthDays INT NOT NULL,
  daysToRecover INT NOT NULL,
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  planId INT NOT NULL,
  platform VARCHAR(255) NOT NULL,
  planType VARCHAR(255) NOT NULL,
  investedAmount BIGINT NOT NULL,
  dailyRatePercent FLOAT NOT NULL,
  totalEarned BIGINT DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  lastYieldAt DATETIME NULL,
  createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_positions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type VARCHAR(255) NOT NULL,
  amount BIGINT NOT NULL,
  description VARCHAR(255) NULL,
  createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_transactions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  amount BIGINT NOT NULL,
  provider VARCHAR(255) NULL,
  transactionId VARCHAR(255) NULL,
  proofUrl VARCHAR(255) NOT NULL,
  status VARCHAR(255) DEFAULT 'pending',
  adminNote VARCHAR(255) NULL,
  reviewedAt DATETIME NULL,
  createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_deposits_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(255) PRIMARY KEY,
  value VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS withdrawal_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL UNIQUE,
  accountNumber VARCHAR(255) NOT NULL,
  accountName VARCHAR(255) NOT NULL,
  isLocked TINYINT(1) DEFAULT 1,
  createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_wa_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  amount BIGINT NOT NULL,
  netAmount BIGINT NOT NULL,
  fee BIGINT NOT NULL,
  accountNumber VARCHAR(255) NOT NULL,
  accountName VARCHAR(255) NOT NULL,
  status VARCHAR(255) DEFAULT 'pending',
  adminNote VARCHAR(255) NULL,
  processedAt DATETIME NULL,
  createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_wr_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Settings par defaut
INSERT INTO settings (`key`, value) VALUES
  ('withdrawal_fee_percent', '20'),
  ('maintenance_fee_percent', '3'),
  ('referral_bonus_percent', '15'),
  ('min_withdrawal', '2000'),
  ('withdrawals_enabled', 'true'),
  ('deposit_phone_mtn', ''),
  ('deposit_phone_orange', '')
ON DUPLICATE KEY UPDATE value = VALUES(value);
