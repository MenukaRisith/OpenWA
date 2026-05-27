import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SessionService } from '../session/session.service';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { User } from '../auth/entities/user.entity';

@ApiTags('labels')
@Controller('sessions/:sessionId/labels')
export class LabelController {
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
  @ApiOperation({ summary: 'Get all labels (WhatsApp Business only)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'List of labels',
  })
  @ApiResponse({ status: 400, description: 'Session not ready or not a business account' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findAll(@Param('sessionId') sessionId: string, @CurrentUser() user?: User) {
    const engine = await this.getEngine(sessionId, user);
    return engine.getLabels();
  }

  @Get(':labelId')
  @ApiOperation({ summary: 'Get a specific label by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'labelId', description: 'Label ID' })
  @ApiResponse({
    status: 200,
    description: 'Label details',
  })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async findOne(@Param('sessionId') sessionId: string, @Param('labelId') labelId: string, @CurrentUser() user?: User) {
    const engine = await this.getEngine(sessionId, user);
    const label = await engine.getLabelById(labelId);
    if (!label) {
      throw new Error(`Label ${labelId} not found`);
    }
    return label;
  }

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Get labels for a specific chat' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiResponse({
    status: 200,
    description: 'List of labels for the chat',
  })
  async getChatLabels(@Param('sessionId') sessionId: string, @Param('chatId') chatId: string, @CurrentUser() user?: User) {
    const engine = await this.getEngine(sessionId, user);
    return engine.getChatLabels(chatId);
  }

  @Post('chat/:chatId')
  @ApiOperation({ summary: 'Add a label to a chat' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        labelId: { type: 'string', description: 'Label ID to add' },
      },
      required: ['labelId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Label added to chat',
  })
  async addLabelToChat(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Body() body: { labelId: string },
    @CurrentUser() user?: User,
  ) {
    const engine = await this.getEngine(sessionId, user);
    await engine.addLabelToChat(chatId, body.labelId);
    return { success: true };
  }

  @Delete('chat/:chatId/:labelId')
  @ApiOperation({ summary: 'Remove a label from a chat' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiParam({ name: 'labelId', description: 'Label ID to remove' })
  @ApiResponse({
    status: 200,
    description: 'Label removed from chat',
  })
  async removeLabelFromChat(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Param('labelId') labelId: string,
    @CurrentUser() user?: User,
  ) {
    const engine = await this.getEngine(sessionId, user);
    await engine.removeLabelFromChat(chatId, labelId);
    return { success: true };
  }
}
