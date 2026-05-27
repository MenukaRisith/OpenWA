import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequireRole } from './decorators/auth.decorators';
import { ApiKeyRole } from './entities/api-key.entity';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('auth/users')
@RequireRole(ApiKeyRole.ADMIN)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'List dashboard users (admin only)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.authService.findAllUsers();
    return users.map(user => this.toUserResponse(user));
  }

  @Post()
  @ApiOperation({ summary: 'Create a dashboard user (admin only)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.authService.createUser(dto);
    return this.toUserResponse(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dashboard user (admin only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.authService.updateUser(id, dto);
    return this.toUserResponse(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a dashboard user (admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.authService.deleteUser(id);
  }

  private toUserResponse(user: User): UserResponseDto {
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
