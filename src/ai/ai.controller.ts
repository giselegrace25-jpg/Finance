import { Controller, Post, Body, Res, UseGuards, Get } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { AiService } from './ai.service';

@UseGuards(AdminGuard)
@Controller('admin/ai')
export class AiController {
  constructor(private aiService: AiService) {}

  // ─── Chat streaming SSE ────────────────────────────────────
  @Post('chat')
  async chat(
    @Body() body: { message: string; history?: Array<{ role: string; content: string }> },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let stream: any;
    try {
      stream = await this.aiService.chatStream(body.message, body.history || []);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
      return;
    }

    let buffer = '';
    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.event_type === 'text-generation') {
            res.write(`data: ${JSON.stringify({ text: event.text })}\n\n`);
          }
        } catch {}
      }
    });

    stream.on('end', () => {
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.event_type === 'text-generation') {
            res.write(`data: ${JSON.stringify({ text: event.text })}\n\n`);
          }
        } catch {}
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

    stream.on('error', () => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

    res.on('close', () => {
      stream?.destroy?.();
    });
  }

  // ─── Export rapport PDF ────────────────────────────────────
  @Get('report/pdf')
  async downloadReport(@Res() res: Response) {
    const pdfBuffer = await this.aiService.generateWeeklyReport();
    const now = new Date();
    const filename = `bettrend-rapport-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}
