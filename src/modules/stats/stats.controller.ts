import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { StatsQueryDto } from './dto/stats-query.dto';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { User } from '../auth/entities/user.entity';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { SessionService } from '../session/session.service';

@ApiTags('Statistics')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly sessionService: SessionService,
  ) {}

  private async visibleSessionIds(user?: User): Promise<string[] | undefined> {
    if (!user || user.role === ApiKeyRole.ADMIN) return undefined;
    const sessions = await this.sessionService.findAll(user.id);
    return sessions.map(session => session.id);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get overall statistics' })
  async getOverview(@CurrentUser() user?: User) {
    return this.statsService.getOverview(await this.visibleSessionIds(user));
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get message statistics with time series' })
  async getMessageStats(@Query() query: StatsQueryDto, @CurrentUser() user?: User) {
    return this.statsService.getMessageStats(query.period || '24h', await this.visibleSessionIds(user));
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get statistics for a specific session' })
  async getSessionStats(@Param('sessionId') sessionId: string, @CurrentUser() user?: User) {
    const ownerUserId = user && user.role !== ApiKeyRole.ADMIN ? user.id : undefined;
    return this.statsService.getSessionStats(sessionId, ownerUserId);
  }
}
