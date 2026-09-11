import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DepositsService } from './deposits.service';

@Controller('deposits')
@UseGuards(JwtAuthGuard)
export class DepositsController {
  constructor(private service: DepositsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('proof', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, `${unique}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp|jpg)$/)) {
        cb(new Error('Seules les images sont acceptees.'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  createDeposit(
    @Request() req,
    @Body('amount') amount: string,
    @Body('provider') provider: string,
    @Body('transactionId') transactionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const proofUrl = `/uploads/${file.filename}`;
    return this.service.createRequest(
      req.user.userId,
      parseInt(amount),
      proofUrl,
      provider || undefined,
      transactionId || undefined,
    );
  }

  @Get('my')
  getMyDeposits(@Request() req) {
    return this.service.getPendingForUser(req.user.userId);
  }
}
