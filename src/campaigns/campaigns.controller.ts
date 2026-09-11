import { Controller, Get, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('plans')
export class CampaignsController {
  constructor(private service: CampaignsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('platform/:platform')
  findByPlatform(@Param('platform') platform: string) {
    return this.service.findByPlatform(platform.toUpperCase());
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug);
  }
}
