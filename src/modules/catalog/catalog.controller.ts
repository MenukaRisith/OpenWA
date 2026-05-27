import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { SendProductDto, SendCatalogDto, ProductQueryDto } from './dto/send-product.dto';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { User } from '../auth/entities/user.entity';
import { SessionService } from '../session/session.service';

@ApiTags('Catalog')
@ApiBearerAuth()
@Controller('sessions/:sessionId')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly sessionService: SessionService,
  ) {}

  private ownerScope(user?: User): string | undefined {
    return user && user.role !== ApiKeyRole.ADMIN ? user.id : undefined;
  }

  private async assertSessionAccess(sessionId: string, user?: User): Promise<void> {
    await this.sessionService.findOne(sessionId, this.ownerScope(user));
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Get business catalog info' })
  async getCatalog(@Param('sessionId') sessionId: string, @CurrentUser() user?: User) {
    await this.assertSessionAccess(sessionId, user);
    return this.catalogService.getCatalog(sessionId);
  }

  @Get('catalog/products')
  @ApiOperation({ summary: 'List catalog products' })
  async getProducts(@Param('sessionId') sessionId: string, @Query() query: ProductQueryDto, @CurrentUser() user?: User) {
    await this.assertSessionAccess(sessionId, user);
    return this.catalogService.getProducts(sessionId, query.page, query.limit);
  }

  @Get('catalog/products/:productId')
  @ApiOperation({ summary: 'Get a specific product' })
  async getProduct(
    @Param('sessionId') sessionId: string,
    @Param('productId') productId: string,
    @CurrentUser() user?: User,
  ) {
    await this.assertSessionAccess(sessionId, user);
    return this.catalogService.getProduct(sessionId, productId);
  }

  @Post('messages/send-product')
  @ApiOperation({ summary: 'Send a product message' })
  async sendProduct(@Param('sessionId') sessionId: string, @Body() dto: SendProductDto, @CurrentUser() user?: User) {
    await this.assertSessionAccess(sessionId, user);
    return this.catalogService.sendProduct(sessionId, dto.chatId, dto.productId, dto.body);
  }

  @Post('messages/send-catalog')
  @ApiOperation({ summary: 'Send catalog link' })
  async sendCatalog(@Param('sessionId') sessionId: string, @Body() dto: SendCatalogDto, @CurrentUser() user?: User) {
    await this.assertSessionAccess(sessionId, user);
    return this.catalogService.sendCatalog(sessionId, dto.chatId, dto.body);
  }
}
