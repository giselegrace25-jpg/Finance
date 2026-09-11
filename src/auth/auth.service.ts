import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

function genReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BT-';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email deja utilise.');

    const hashed = await bcrypt.hash(dto.password, 10);
    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = genReferralCode();
      const exists = await this.usersRepo.findOneBy({ referralCode });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);
    if (attempts >= 10) throw new ConflictException('Impossible de generer un code de parrainage unique.');

    let referredBy: number | null = null;
    if (dto.referralCode) {
      const referrer = await this.usersRepo.findOneBy({ referralCode: dto.referralCode });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    const user = this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: hashed,
      balance: 0,
      referralCode,
      referredBy: referredBy ?? undefined,
    });
    await this.usersRepo.save(user);

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, balance: 0, referralCode, isAdmin: user.isAdmin } };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOneBy({ email: dto.email });
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect.');

    if (user.banned) throw new UnauthorizedException('Votre compte a ete suspendu. Contactez le support.');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Email ou mot de passe incorrect.');

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, balance: user.balance, referralCode: user.referralCode, isAdmin: user.isAdmin } };
  }
}
