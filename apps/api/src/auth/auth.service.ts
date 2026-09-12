import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type { UserRole } from '@turnero/shared';
import {
  COMPANY_REQUIRED_ERROR,
  GENERIC_LOGIN_ERROR,
} from '../common/constants';
import { MemoryRateLimiter } from '../common/memory-rate-limiter';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, JwtAccessPayload } from './auth.types';
import { PasswordService } from './password.service';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

@Injectable()
export class AuthService {
  private readonly loginLimiter: MemoryRateLimiter;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private dummyHash: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    config: ConfigService,
  ) {
    const limit = Number(config.get('LOGIN_RATE_LIMIT') ?? 5);
    const windowMs = Number(config.get('LOGIN_RATE_WINDOW_MS') ?? 60_000);
    this.loginLimiter = new MemoryRateLimiter(limit, windowMs);
    this.accessExpiresIn = config.get('JWT_EXPIRES_IN') ?? '15m';
    this.refreshExpiresIn = config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  async login(
    email: string,
    password: string,
    companySlug: string | undefined,
    ip: string,
  ): Promise<TokenPair> {
    const normalized = email.trim().toLowerCase();
    if (!this.loginLimiter.consume(`login:${ip}:${normalized}`)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Demasiados intentos. Probá de nuevo en un minuto.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (companySlug) {
      const company = await this.prisma.company.findFirst({
        where: { slug: companySlug, deletedAt: null, active: true },
      });
      const user = company
        ? await this.prisma.user.findFirst({
            where: {
              companyId: company.id,
              email: normalized,
              deletedAt: null,
            },
          })
        : null;
      return this.finishLogin(user, password);
    }

    const matches = await this.prisma.user.findMany({
      where: {
        email: normalized,
        deletedAt: null,
        company: { deletedAt: null, active: true },
      },
      include: { company: true },
    });

    if (matches.length > 1) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'COMPANY_REQUIRED',
          message: COMPANY_REQUIRED_ERROR,
          companies: matches.map((row) => ({
            slug: row.company.slug,
            name: row.company.name,
          })),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.finishLogin(matches[0] ?? null, password);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { company: true } } },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now() ||
      !stored.user.active ||
      stored.user.deletedAt ||
      !stored.user.company.active ||
      stored.user.company.deletedAt
    ) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(user: AuthenticatedUser) {
    const row = await this.prisma.user.findFirstOrThrow({
      where: { id: user.id, companyId: user.companyId },
      include: { company: true },
    });

    return {
      user: {
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        branchId: row.branchId,
        professionalId: row.professionalId,
        active: row.active,
      },
      company: publicCompany(row.company),
      access: {
        companyId: row.companyId,
        role: row.role,
        branchId: row.branchId,
        professionalId: row.professionalId,
      },
    };
  }

  private async finishLogin(
    user: {
      id: string;
      email: string;
      passwordHash: string;
      companyId: string;
      role: UserRole;
      branchId: string | null;
      professionalId: string | null;
      active: boolean;
      deletedAt: Date | null;
    } | null,
    password: string,
  ): Promise<TokenPair> {
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await this.passwords.verify(password, hash);
    if (
      !user ||
      !valid ||
      !user.active ||
      user.deletedAt
    ) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    return this.issueTokens(user);
  }

  private async getDummyHash(): Promise<string> {
    this.dummyHash ??= await this.passwords.hash('not-a-real-password');
    return this.dummyHash;
  }

  private async issueTokens(user: {
    id: string;
    companyId: string;
    role: UserRole;
    branchId: string | null;
    professionalId: string | null;
  }): Promise<TokenPair> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      branchId: user.branchId,
      professionalId: user.professionalId,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.accessExpiresIn as `${number}m`,
    });
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + parseDuration(this.refreshExpiresIn));
    await this.prisma.refreshToken.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(parseDuration(this.accessExpiresIn) / 1000),
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    return 15 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 60_000);
}

function publicCompany(company: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  locale: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  contactEmail: string;
  contactPhone: string | null;
}) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    timezone: company.timezone,
    currency: company.currency,
    locale: company.locale,
    logoUrl: company.logoUrl,
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
  };
}
