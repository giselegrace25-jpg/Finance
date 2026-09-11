import { Controller, Get } from '@nestjs/common';
import { PoolService } from './pool.service';

@Controller('pool')
export class PoolController {
  constructor(private service: PoolService) {}

  @Get('status')
  getStatus() {
    return this.service.getPublicStatus();
  }
}
