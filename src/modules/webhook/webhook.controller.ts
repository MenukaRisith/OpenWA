import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto, WebhookResponseDto } from './dto';
import { Webhook } from './entities/webhook.entity';
import { CurrentUser, RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { User } from '../auth/entities/user.entity';
import { SessionService } from '../session/session.service';

@ApiTags('webhooks')
@Controller('sessions/:sessionId/webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly sessionService: SessionService,
  ) {}

  private ownerScope(user?: User): string | undefined {
    return user && user.role !== ApiKeyRole.ADMIN ? user.id : undefined;
  }

  @Post()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create a webhook for the session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 201,
    description: 'Webhook created',
    type: WebhookResponseDto,
  })
  async create(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user?: User,
  ): Promise<Webhook> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
    return this.webhookService.create(sessionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks for a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'List of webhooks',
    type: [WebhookResponseDto],
  })
  async findBySession(@Param('sessionId') sessionId: string, @CurrentUser() user?: User): Promise<Webhook[]> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
    return this.webhookService.findBySession(sessionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook details',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(@Param('sessionId') sessionId: string, @Param('id') id: string, @CurrentUser() user?: User): Promise<Webhook> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
    return this.webhookService.findOne(id, sessionId);
  }

  @Put(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async update(
    @Param('sessionId') sessionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user?: User,
  ): Promise<Webhook> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
    return this.webhookService.update(id, dto, sessionId);
  }

  @Post(':id/test')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Test a webhook by sending a test payload' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Test result' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async test(
    @Param('sessionId') sessionId: string,
    @Param('id') id: string,
    @CurrentUser() user?: User,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
    return this.webhookService.test(sessionId, id);
  }

  @Delete(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async delete(@Param('sessionId') sessionId: string, @Param('id') id: string, @CurrentUser() user?: User): Promise<void> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
    return this.webhookService.delete(id, sessionId);
  }
}
