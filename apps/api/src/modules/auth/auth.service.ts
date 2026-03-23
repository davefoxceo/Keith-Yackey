import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DataStore } from '../learning/data-store.service';

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  relationshipStatus?: string;
  timezone?: string;
  refreshToken?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataStore: DataStore,
  ) {}

  private get users(): Map<string, StoredUser> {
    return this.dataStore.getAll<StoredUser>('users');
  }

  private getEmailIndex(): Map<string, string> {
    // Build email index from users on the fly
    const index = new Map<string, string>();
    for (const [id, user] of this.users) {
      index.set(user.email, id);
    }
    return index;
  }

  async register(dto: RegisterDto) {
    // Check for existing user
    if (this.getEmailIndex().has(dto.email.toLowerCase())) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const user: StoredUser = {
      id: userId,
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      relationshipStatus: dto.relationshipStatus,
      timezone: dto.timezone || 'America/Chicago',
      createdAt: now,
      updatedAt: now,
    };

    this.dataStore.set('users', userId, user);

    this.logger.log(`New user registered: ${user.email} (${userId})`);

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const userId = this.getEmailIndex().get(email);

    if (!userId) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`User logged in: ${user.email}`);

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = this.users.get(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify the refresh token matches the stored one
      if (user.refreshToken !== refreshToken) {
        // Token reuse detected - invalidate all tokens for security
        user.refreshToken = undefined;
        throw new UnauthorizedException(
          'Refresh token has been revoked. Please log in again.',
        );
      }

      this.logger.log(`Tokens refreshed for user: ${user.email}`);

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = this.users.get(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      relationshipStatus: user.relationshipStatus,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };
  }

  async findUserById(userId: string): Promise<StoredUser | undefined> {
    return this.users.get(userId);
  }

  private async generateTokens(user: StoredUser) {
    const payload = { sub: user.id, email: user.email };
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION', '24h');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '30d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn }),
      this.jwtService.signAsync(payload, { expiresIn: refreshExpiresIn }),
    ]);

    // Store refresh token for rotation (persisted)
    user.refreshToken = refreshToken;
    user.updatedAt = new Date().toISOString();
    this.dataStore.set('users', user.id, user);

    const expiresInSeconds = this.parseExpirationToSeconds(expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // Default 24h

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 86400;
    }
  }
}
