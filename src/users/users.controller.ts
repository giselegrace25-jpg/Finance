import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() body: { name?: string; email?: string; phone?: string }) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Patch('me/password')
  changePassword(@Request() req, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.usersService.changePassword(req.user.userId, body.oldPassword, body.newPassword);
  }

  @Get('referrals')
  getReferrals(@Request() req) {
    return this.usersService.getReferrals(req.user.userId);
  }

  @Get('config')
  getConfig() {
    return this.usersService.getPublicConfig();
  }
}
