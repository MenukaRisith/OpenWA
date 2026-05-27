import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { SessionService } from '../session/session.service';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { User } from '../auth/entities/user.entity';

@ApiTags('channels')
@Controller('sessions/:sessionId/channels')
export class ChannelController {
  constructor(private readonly sessionService: SessionService) {}

  private ownerScope(user?: User): string | undefined {
    return user && user.role !== ApiKeyRole.ADMIN ? user.id : undefined;
  }

  private async getEngine(sessionId: string, user?: User) {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    return engine;
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscribed channels/newsletters' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'List of subscribed channels',
  })
  @ApiResponse({ status: 400, description: 'Session not ready' })
  async findAll(@Param('sessionId') sessionId: string, @CurrentUser() user?: User) {
    const engine = await this.getEngine(sessionId, user);
    return engine.getSubscribedChannels();
  }

  @Get(':channelId')
  @ApiOperation({ summary: 'Get a specific channel by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({
    status: 200,
    description: 'Channel details',
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findOne(@Param('sessionId') sessionId: string, @Param('channelId') channelId: string, @CurrentUser() user?: User) {
    const engine = await this.getEngine(sessionId, user);
    const channel = await engine.getChannelById(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    return channel;
  }

  @Get(':channelId/messages')
  @ApiOperation({ summary: 'Get messages from a channel' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max messages to return (default 50)' })
  @ApiResponse({
    status: 200,
    description: 'List of channel messages',
  })
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: User,
  ) {
    const engine = await this.getEngine(sessionId, user);
    return engine.getChannelMessages(channelId, limit ? parseInt(limit, 10) : undefined);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to a channel using invite code' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        inviteCode: {
          type: 'string',
          description: 'Channel invite code (from channel link)',
          example: 'ABC123xyz',
        },
      },
      required: ['inviteCode'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully subscribed to channel',
  })
  async subscribe(@Param('sessionId') sessionId: string, @Body() body: { inviteCode: string }, @CurrentUser() user?: User) {
    const engine = await this.getEngine(sessionId, user);
    return engine.subscribeToChannel(body.inviteCode);
  }

  @Delete(':channelId')
  @ApiOperation({ summary: 'Unsubscribe from a channel' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID to unsubscribe from' })
  @ApiResponse({
    status: 200,
    description: 'Successfully unsubscribed from channel',
  })
  async unsubscribe(
    @Param('sessionId') sessionId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() user?: User,
  ) {
    const engine = await this.getEngine(sessionId, user);
    await engine.unsubscribeFromChannel(channelId);
    return { success: true };
  }
}
