import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './campaign.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService, TypeOrmModule],
})
export class CampaignsModule {}
