import { Body, Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { IsOptional, IsString } from 'class-validator';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { scopedFacility } from '../auth/scope';
import { TenantService } from '../tenant/tenant.service';
import type { AuthUser } from '../tenant/tenant.types';

class ShiftReportDto {
  @IsOptional()
  @IsString()
  facility?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly tenant: TenantService,
  ) {}

  @Post('shift')
  create(@Body() body: ShiftReportDto, @Req() req: { user: AuthUser }) {
    return this.reports.create(scopedFacility(this.tenant, req.user, body.facility), body.notes ?? '');
  }

  @Get('shift/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async download(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.reports.pdf(Number(id));
    res.setHeader('Content-Disposition', `attachment; filename="aquasense-shift-${id}.pdf"`);
    res.send(pdf);
  }

  @Get('shift/preview')
  preview(@Query('facility') facility?: string, @Req() req?: { user: AuthUser }) {
    return this.reports.snapshot(scopedFacility(this.tenant, req?.user, facility), '');
  }
}
