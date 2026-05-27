import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ApiKey, ApiKeyRole } from './entities/api-key.entity';
import { User } from './entities/user.entity';
import { CreateApiKeyDto, CreateUserDto, LoginDto, UpdateApiKeyDto, UpdateUserDto } from './dto';
import { createLogger } from '../../common/services/logger.service';

const API_KEY_FILE = join(process.cwd(), 'data', '.api-key');
const ADMIN_PASSWORD_FILE = join(process.cwd(), 'data', '.admin-password');

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = createLogger('AuthService');

  constructor(
    @InjectRepository(ApiKey, 'main')
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User, 'main')
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    const keyCount = await this.apiKeyRepository.count();
    const userCount = await this.userRepository.count();
    let displayKey: string;
    let isNewKey = false;
    let displayAdminUsername = process.env.OPENWA_ADMIN_USERNAME || 'admin';
    let displayAdminPassword = '(configured)';
    let isNewAdmin = false;

    if (keyCount === 0) {
      displayKey =
        process.env.NODE_ENV === 'production' ? `owa_k1_${randomBytes(32).toString('hex')}` : 'dev-admin-key';

      await this.seedApiKey(displayKey, 'Default Admin Key', ApiKeyRole.ADMIN);
      isNewKey = true;

      try {
        writeFileSync(API_KEY_FILE, displayKey, 'utf-8');
      } catch (err) {
        this.logger.warn('Could not save API key file', { error: String(err) });
      }
    } else if (existsSync(API_KEY_FILE)) {
      try {
        displayKey = readFileSync(API_KEY_FILE, 'utf-8').trim();
      } catch (error) {
        this.logger.warn(`Failed to read API key file: ${API_KEY_FILE}`, { error: String(error) });
        displayKey = '(check dashboard for keys)';
      }
    } else {
      displayKey = '(check dashboard for keys)';
    }

    const configuredAdmin = await this.ensureConfiguredAdminUser();

    if (configuredAdmin) {
      displayAdminUsername = configuredAdmin.username;
      displayAdminPassword = '(configured from environment)';
    } else if (userCount === 0) {
      displayAdminUsername = process.env.OPENWA_ADMIN_USERNAME || 'admin';
      displayAdminPassword =
        process.env.OPENWA_ADMIN_PASSWORD ||
        (process.env.NODE_ENV === 'production' ? randomBytes(12).toString('base64url') : 'admin12345');

      await this.seedUser(displayAdminUsername, 'Default Admin', displayAdminPassword, ApiKeyRole.ADMIN);
      isNewAdmin = true;

      try {
        writeFileSync(ADMIN_PASSWORD_FILE, `username=${displayAdminUsername}\npassword=${displayAdminPassword}\n`, 'utf-8');
      } catch (err) {
        this.logger.warn('Could not save admin credentials file', { error: String(err) });
      }
    }

    const apiBaseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 2785}`;
    const dashboardUrl = process.env.DASHBOARD_URL || `http://localhost:${process.env.DASHBOARD_PORT || 2886}`;

    this.logger.log('');
    this.logger.log('--------------------------------------------------------------------------------');
    this.logger.log('');
    this.logger.log('  Welcome to OpenWA - WhatsApp API Gateway');
    this.logger.log('');
    this.logger.log(`  Dashboard: ${dashboardUrl}`);
    this.logger.log(`  API Docs:  ${apiBaseUrl}/api/docs`);
    this.logger.log('');
    this.logger.log(isNewKey ? '  API Key (newly created):' : '  API Key:');
    this.logger.log(`     ${displayKey}`);
    this.logger.log('');
    if (isNewAdmin) {
      this.logger.log('  Dashboard admin user (newly created):');
      this.logger.log(`     Username: ${displayAdminUsername}`);
      this.logger.log(`     Password: ${displayAdminPassword}`);
    } else {
      this.logger.log('  Dashboard login: use an existing admin user');
    }
    this.logger.log('');
    this.logger.log('--------------------------------------------------------------------------------');
    this.logger.log('');
  }

  private async seedApiKey(rawKey: string, name: string, role: ApiKeyRole): Promise<ApiKey> {
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = this.apiKeyRepository.create({
      name,
      ownerUserId: null,
      keyHash,
      keyPrefix,
      role,
    });

    return this.apiKeyRepository.save(apiKey);
  }

  private async seedUser(username: string, displayName: string, password: string, role: ApiKeyRole): Promise<User> {
    const user = this.userRepository.create({
      username: this.normalizeUsername(username),
      displayName,
      passwordHash: this.hashPassword(password),
      role,
    });

    return this.userRepository.save(user);
  }

  private async ensureConfiguredAdminUser(): Promise<User | null> {
    const configuredUsername = process.env.OPENWA_ADMIN_USERNAME;
    const configuredPassword = process.env.OPENWA_ADMIN_PASSWORD;

    if (!configuredUsername || !configuredPassword) {
      return null;
    }

    const username = this.normalizeUsername(configuredUsername);
    const existing = await this.userRepository.findOne({ where: { username } });

    if (existing) {
      existing.displayName = existing.displayName || 'Configured Admin';
      existing.passwordHash = this.hashPassword(configuredPassword);
      existing.role = ApiKeyRole.ADMIN;
      existing.isActive = true;
      existing.sessionTokenHash = null;
      return this.userRepository.save(existing);
    }

    return this.seedUser(username, 'Configured Admin', configuredPassword, ApiKeyRole.ADMIN);
  }

  async createApiKey(dto: CreateApiKeyDto): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = `owa_k1_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = this.apiKeyRepository.create({
      name: dto.name,
      ownerUserId: null,
      keyHash,
      keyPrefix,
      role: dto.role || ApiKeyRole.OPERATOR,
      allowedIps: dto.allowedIps || null,
      allowedSessions: dto.allowedSessions || null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const saved = await this.apiKeyRepository.save(apiKey);
    this.logger.log(`API key created: ${saved.name}`, {
      keyId: saved.id,
      role: saved.role,
      action: 'api_key_created',
    });

    return { apiKey: saved, rawKey };
  }

  async findAll(): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException(`API key with id '${id}' not found`);
    }
    return apiKey;
  }

  async update(id: string, dto: UpdateApiKeyDto): Promise<ApiKey> {
    const apiKey = await this.findOne(id);

    if (dto.name) apiKey.name = dto.name;
    if (dto.role) apiKey.role = dto.role;
    if (dto.allowedIps !== undefined) apiKey.allowedIps = dto.allowedIps;
    if (dto.allowedSessions !== undefined) apiKey.allowedSessions = dto.allowedSessions;
    if (dto.expiresAt !== undefined) apiKey.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    return this.apiKeyRepository.save(apiKey);
  }

  async delete(id: string): Promise<void> {
    const apiKey = await this.findOne(id);
    await this.apiKeyRepository.remove(apiKey);
    this.logger.log(`API key deleted: ${apiKey.name}`, {
      keyId: id,
      action: 'api_key_deleted',
    });
  }

  async revoke(id: string): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    apiKey.isActive = false;
    return this.apiKeyRepository.save(apiKey);
  }

  async login(dto: LoginDto): Promise<{ user: User; token: string }> {
    const username = this.normalizeUsername(dto.username);
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is disabled');
    }

    const token = `owa_u1_${randomBytes(32).toString('hex')}`;
    user.sessionTokenHash = this.hashKey(token);
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return { user, token };
  }

  async validateUserToken(rawToken: string): Promise<User> {
    const sessionTokenHash = this.hashKey(rawToken);
    const user = await this.userRepository.findOne({ where: { sessionTokenHash } });

    if (!user) {
      throw new UnauthorizedException('Invalid user token');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is disabled');
    }

    return user;
  }

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const username = this.normalizeUsername(dto.username);
    const existing = await this.userRepository.findOne({ where: { username } });

    if (existing) {
      throw new ConflictException('Username is already in use');
    }

    const user = this.userRepository.create({
      username,
      displayName: dto.displayName,
      passwordHash: this.hashPassword(dto.password),
      role: dto.role || ApiKeyRole.VIEWER,
      isActive: true,
    });

    return this.userRepository.save(user);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findUser(id);
    const nextRole = dto.role ?? user.role;
    const nextIsActive = dto.isActive ?? user.isActive;

    await this.ensureAdminRemains(user, nextRole, nextIsActive);

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password !== undefined) {
      user.passwordHash = this.hashPassword(dto.password);
      user.sessionTokenHash = null;
    }

    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findUser(id);
    await this.ensureAdminRemains(user, ApiKeyRole.VIEWER, false);
    await this.userRepository.remove(user);
  }

  async validateApiKey(rawKey: string, clientIp?: string, sessionId?: string): Promise<ApiKey> {
    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.apiKeyRepository.findOne({ where: { keyHash } });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new UnauthorizedException('API key is revoked');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    if (apiKey.allowedIps && apiKey.allowedIps.length > 0 && clientIp) {
      if (!this.isIpAllowed(clientIp, apiKey.allowedIps)) {
        this.logger.warn(`IP not allowed: ${clientIp}`, {
          keyId: apiKey.id,
          action: 'ip_rejected',
        });
        throw new UnauthorizedException('IP address not allowed');
      }
    }

    if (apiKey.allowedSessions && apiKey.allowedSessions.length > 0 && sessionId) {
      if (!apiKey.allowedSessions.includes(sessionId)) {
        throw new UnauthorizedException('API key not authorized for this session');
      }
    }

    apiKey.lastUsedAt = new Date();
    apiKey.usageCount += 1;
    await this.apiKeyRepository.save(apiKey);

    return apiKey;
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const iterations = 120000;
    const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [algorithm, iterationsText, salt, expectedHash] = storedHash.split('$');
    if (algorithm !== 'pbkdf2_sha256' || !iterationsText || !salt || !expectedHash) {
      return false;
    }

    const iterations = Number(iterationsText);
    if (!Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    const actual = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private async ensureAdminRemains(user: User, nextRole: ApiKeyRole, nextIsActive: boolean): Promise<void> {
    const removesAdminAccess = user.role === ApiKeyRole.ADMIN && user.isActive && (nextRole !== ApiKeyRole.ADMIN || !nextIsActive);

    if (!removesAdminAccess) {
      return;
    }

    const activeAdmins = await this.userRepository.count({
      where: { role: ApiKeyRole.ADMIN, isActive: true },
    });

    if (activeAdmins <= 1) {
      throw new BadRequestException('At least one active admin user is required');
    }
  }

  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    for (const entry of allowedIps) {
      if (entry.includes('/')) {
        if (this.ipInCidr(clientIp, entry)) {
          return true;
        }
      } else if (clientIp === entry) {
        return true;
      }
    }
    return false;
  }

  private ipInCidr(ip: string, cidr: string): boolean {
    try {
      const [range, bitsStr] = cidr.split('/');
      const bits = parseInt(bitsStr, 10);

      if (isNaN(bits) || bits < 0 || bits > 32) {
        return false;
      }

      const mask = ~(2 ** (32 - bits) - 1);
      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);

      return (ipNum & mask) === (rangeNum & mask);
    } catch (error) {
      this.logger.warn(`Invalid CIDR format: ${cidr}`, { error: String(error) });
      return false;
    }
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;

    return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  hasPermission(principal: Pick<ApiKey | User, 'role'>, requiredRole: ApiKeyRole): boolean {
    const roleHierarchy: Record<ApiKeyRole, number> = {
      [ApiKeyRole.VIEWER]: 1,
      [ApiKeyRole.OPERATOR]: 2,
      [ApiKeyRole.ADMIN]: 3,
    };

    return roleHierarchy[principal.role] >= roleHierarchy[requiredRole];
  }
}
