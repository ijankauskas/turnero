import type { UserRole } from './enums';

export type JwtAccessPayload = {
  sub: string;
  companyId: string;
  role: UserRole;
  branchId?: string | null;
  professionalId?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type PublicCompanyBranding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};
