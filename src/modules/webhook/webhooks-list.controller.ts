import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { Webhook } from './entities/webhook.entity';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { User } from '../auth/entities/user.entity';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { SessionService } from '../session/session.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksListController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly sessionService: SessionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all webhooks across all sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of all webhooks',
  })
  async findAll(@CurrentUser() user?: User): Promise<Webhook[]> {
    if (user && user.role !== ApiKeyRole.ADMIN) {
      const sessions = await this.sessionService.findAll(user.id);
      return this.webhookService.findAll(sessions.map(session => session.id));
    }
    return this.webhookService.findAll();
  }
}
