import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatusService } from './status.service';
import { SendTextStatusDto } from './dto/send-text-status.dto';
import { SendImageStatusDto, SendVideoStatusDto } from './dto/send-media-status.dto';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { User } from '../auth/entities/user.entity';
import { SessionService } from '../session/session.service';

@ApiTags('Status')
@ApiBearerAuth()
@Controller('sessions/:sessionId/status')
export class StatusController {
  constructor(
    private readonly statusService: StatusService,
    private readonly sessionService: SessionService,
  ) {}

  private ownerScope(user?: User): string | undefined {
    return user && user.role !== ApiKeyRole.ADMIN ? user.id : undefined;
  }

  private async assertSessionAccess(sessionId: string, user?: User): Promise<void> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
  }

  @Get()
  @ApiOperation({ summary: 'Get all contact status updates' })
  async getStatuses(@Param('sessionId') sessionId: string, @CurrentUser() user?: User) {
    await this.assertSessionAccess(sessionId, user);
    return { statuses: await this.statusService.getStatuses(sessionId) };
  }

  @Get(':contactId')
  @ApiOperation({ summary: 'Get status updates from a specific contact' })
  async getContactStatus(
    @Param('sessionId') sessionId: string,
    @Param('contactId') contactId: string,
    @CurrentUser() user?: User,
  ) {
    await this.assertSessionAccess(sessionId, user);
    return { statuses: await this.statusService.getContactStatus(sessionId, contactId) };
  }

  @Post('send-text')
  @ApiOperation({ summary: 'Post a text status' })
  async sendTextStatus(@Param('sessionId') sessionId: string, @Body() dto: SendTextStatusDto, @CurrentUser() user?: User) {
    await this.assertSessionAccess(sessionId, user);
    return this.statusService.postTextStatus(sessionId, dto.text, {
      backgroundColor: dto.backgroundColor,
      font: dto.font,
    });
  }

  @Post('send-image')
  @ApiOperation({ summary: 'Post an image status' })
  async sendImageStatus(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendImageStatusDto,
    @CurrentUser() user?: User,
  ) {
    await this.assertSessionAccess(sessionId, user);
    return this.statusService.postImageStatus(sessionId, dto.image, dto.caption);
  }

  @Post('send-video')
  @ApiOperation({ summary: 'Post a video status' })
  async sendVideoStatus(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendVideoStatusDto,
    @CurrentUser() user?: User,
  ) {
    await this.assertSessionAccess(sessionId, user);
    return this.statusService.postVideoStatus(sessionId, dto.video, dto.caption);
  }

  @Delete(':statusId')
  @ApiOperation({ summary: 'Delete own status' })
  async deleteStatus(@Param('sessionId') sessionId: string, @Param('statusId') statusId: string, @CurrentUser() user?: User) {
    await this.assertSessionAccess(sessionId, user);
    await this.statusService.deleteStatus(sessionId, statusId);
    return { message: 'Status deleted successfully' };
  }
}
