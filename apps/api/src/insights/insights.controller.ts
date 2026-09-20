import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { InsightOverview } from '@fit-trace/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InsightQueryDto } from './dto/insight-query.dto';
import { InsightsService } from './insights.service';

@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get('overview')
  async overview(
    @CurrentUser('sub') userId: string,
    @Query() query: InsightQueryDto,
  ): Promise<{ data: InsightOverview }> {
    return { data: await this.insights.overview(userId, query.days, query.tzOffset) };
  }
}
