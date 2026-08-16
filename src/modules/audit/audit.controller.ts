import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService, AuditQueryOptions } from './audit.service';
import { AuditLog, AuditAction, AuditSeverity } from './entities/audit-log.entity';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { User } from '../auth/entities/user.entity';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Session } from '../session/entities/session.entity';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    @InjectRepository(Session, 'data')
    private readonly sessionRepository: Repository<Session>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs with optional filters' })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'severity', required: false, enum: AuditSeverity })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'apiKeyId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String, format: 'date-time' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of audit logs',
  })
  async findAll(
    @Query('action') action?: AuditAction,
    @Query('severity') severity?: AuditSeverity,
    @Query('sessionId') sessionId?: string,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('startDate') startDate?: string,
    @CurrentUser() user?: User,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const options: AuditQueryOptions = {};
    if (action) options.action = action;
    if (severity) options.severity = severity;
    if (sessionId) options.sessionId = sessionId;
    if (apiKeyId) options.apiKeyId = apiKeyId;
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);
    if (startDate) {
      const parsedStartDate = new Date(startDate);
      if (Number.isNaN(parsedStartDate.getTime())) throw new BadRequestException('Invalid startDate');
      options.startDate = parsedStartDate;
      options.endDate = new Date();
    }
    if (user && user.role !== ApiKeyRole.ADMIN) {
      const tenantId = user.tenantId || user.id;
      const sessions = await this.sessionRepository.find({
        where: [
          { tenantId },
          { ownerUserId: tenantId, tenantId: IsNull() },
        ],
      });
      const visibleSessionIds = sessions.map(session => session.id);

      if (sessionId && !visibleSessionIds.includes(sessionId)) {
        return { data: [], total: 0 };
      }
      if (!sessionId) {
        options.sessionIds = visibleSessionIds;
      }
    }

    return this.auditService.findAll(options);
  }
}
