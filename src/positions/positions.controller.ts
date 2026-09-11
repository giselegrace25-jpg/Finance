import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PositionsService } from './positions.service';
import { InvestDto } from './dto/invest.dto';

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionsController {
  constructor(private posService: PositionsService) {}

  @Get()
  getPositions(@Request() req) {
    return this.posService.getPositions(req.user.userId);
  }

  @Post('invest')
  invest(@Request() req, @Body() body: InvestDto) {
    return this.posService.invest(req.user.userId, body.planSlug, body.amount);
  }
}
