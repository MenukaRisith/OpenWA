import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyResponseDto, ApiKeyCreatedResponseDto } from './dto';
import { CurrentUser, RequireRole } from './decorators/auth.decorators';
import { ApiKeyRole } from './entities/api-key.entity';
import { User } from './entities/user.entity';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth/api-keys')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private ownerScope(user?: User): string | undefined {
    return user && user.role !== ApiKeyRole.ADMIN ? user.id : undefined;
  }

  private assertCanAssignRole(user: User | undefined, role: ApiKeyRole | undefined): void {
    if (user?.role !== ApiKeyRole.ADMIN && role === ApiKeyRole.ADMIN) {
      throw new ForbiddenException('Only admins can create or assign admin API keys');
    }
  }

  @Post()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created',
    type: ApiKeyCreatedResponseDto,
  })
  async create(@Body() dto: CreateApiKeyDto, @CurrentUser() user?: User): Promise<ApiKeyCreatedResponseDto> {
    this.assertCanAssignRole(user, dto.role);
    const { apiKey, rawKey } = await this.authService.createApiKey(dto, this.ownerScope(user));
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      role: apiKey.role,
      allowedIps: apiKey.allowedIps || undefined,
      allowedSessions: apiKey.allowedSessions || undefined,
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt || undefined,
      lastUsedAt: apiKey.lastUsedAt || undefined,
      usageCount: apiKey.usageCount,
      createdAt: apiKey.createdAt,
      apiKey: rawKey,
    };
  }

  @Get()
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List API keys' })
  @ApiResponse({ status: 200, type: [ApiKeyResponseDto] })
  async findAll(@CurrentUser() user?: User): Promise<ApiKeyResponseDto[]> {
    const keys = await this.authService.findAll(this.ownerScope(user));
    return keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      role: k.role,
      allowedIps: k.allowedIps || undefined,
      allowedSessions: k.allowedSessions || undefined,
      isActive: k.isActive,
      expiresAt: k.expiresAt || undefined,
      lastUsedAt: k.lastUsedAt || undefined,
      usageCount: k.usageCount,
      createdAt: k.createdAt,
    }));
  }

  @Get(':id')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get API key details' })
  @ApiResponse({ status: 200, type: ApiKeyResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser() user?: User): Promise<ApiKeyResponseDto> {
    const k = await this.authService.findOne(id, this.ownerScope(user));
    return {
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      role: k.role,
      allowedIps: k.allowedIps || undefined,
      allowedSessions: k.allowedSessions || undefined,
      isActive: k.isActive,
      expiresAt: k.expiresAt || undefined,
      lastUsedAt: k.lastUsedAt || undefined,
      usageCount: k.usageCount,
      createdAt: k.createdAt,
    };
  }

  @Put(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, type: ApiKeyResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto, @CurrentUser() user?: User): Promise<ApiKeyResponseDto> {
    this.assertCanAssignRole(user, dto.role);
    const k = await this.authService.update(id, dto, this.ownerScope(user));
    return {
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      role: k.role,
      allowedIps: k.allowedIps || undefined,
      allowedSessions: k.allowedSessions || undefined,
      isActive: k.isActive,
      expiresAt: k.expiresAt || undefined,
      lastUsedAt: k.lastUsedAt || undefined,
      usageCount: k.usageCount,
      createdAt: k.createdAt,
    };
  }

  @Delete(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 204, description: 'API key deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user?: User): Promise<void> {
    await this.authService.delete(id, this.ownerScope(user));
  }

  @Post(':id/revoke')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 200, type: ApiKeyResponseDto })
  async revoke(@Param('id') id: string, @CurrentUser() user?: User): Promise<ApiKeyResponseDto> {
    const k = await this.authService.revoke(id, this.ownerScope(user));
    return {
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      role: k.role,
      allowedIps: k.allowedIps || undefined,
      allowedSessions: k.allowedSessions || undefined,
      isActive: k.isActive,
      expiresAt: k.expiresAt || undefined,
      lastUsedAt: k.lastUsedAt || undefined,
      usageCount: k.usageCount,
      createdAt: k.createdAt,
    };
  }
}
