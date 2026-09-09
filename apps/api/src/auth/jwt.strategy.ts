import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, JwtAccessPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'cambiar-en-produccion',
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        companyId: payload.companyId,
        deletedAt: null,
      },
      include: { company: true },
    });

    if (
      !user?.active ||
      user.company.deletedAt ||
      !user.company.active
    ) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      branchId: user.branchId,
      professionalId: user.professionalId,
    };
  }
}
