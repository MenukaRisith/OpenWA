import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { createLogger } from '../../common/services/logger.service';
import { Public } from './decorators/auth.decorators';
import { LoginDto, LoginResponseDto } from './dto';
import { User } from './entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthValidateController {
  private readonly logger = createLogger('AuthValidateController');

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a dashboard user' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const { user, token } = await this.authService.login(dto);
    return {
      token,
      user: this.toUserResponse(user),
    };
  }

  @Post('validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate an API key or dashboard user token' })
  @ApiHeader({ name: 'X-API-Key', description: 'API key to validate' })
  @ApiResponse({ status: 200, description: 'API key is valid' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  async validate(
    @Headers('x-api-key') apiKey?: string,
    @Headers('authorization') authorization?: string,
  ): Promise<{ valid: boolean; role?: string; username?: string }> {
    const bearerToken = authorization?.startsWith('Bearer ') ? authorization.substring(7) : undefined;

    if (!apiKey && !bearerToken) {
      return { valid: false };
    }

    try {
      if (apiKey) {
        const keyEntity = await this.authService.validateApiKey(apiKey);
        return { valid: true, role: keyEntity.role };
      }
      const user = await this.authService.validateUserToken(bearerToken as string);
      return { valid: true, role: user.role, username: user.username };
    } catch (error) {
      this.logger.warn('Auth validation error', { error: error instanceof Error ? error.message : String(error) });
      return { valid: false };
    }
  }

  private toUserResponse(user: User): LoginResponseDto['user'] {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
