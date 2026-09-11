import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (token) {
      try {
        const payload = this.jwt.verify<{ sub: number; email: string }>(token);
        const user = await this.usersRepo.findOneBy({ id: payload.sub });
        if (user?.isAdmin && !user.banned) {
          req.user = { userId: user.id, email: user.email, isAdmin: true };
          return true;
        }
      } catch {
        throw new UnauthorizedException('Session admin invalide.');
      }
    }

    const key = req.headers['x-admin-key'];
    const expected = this.config.get<string>('ADMIN_PASS');
    if (expected && key === expected) return true;

    throw new UnauthorizedException('Acces admin refuse.');
  }
}
