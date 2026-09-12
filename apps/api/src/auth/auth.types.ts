import type { UserRole } from '@turnero/shared';

export type AuthenticatedUser = {
  id: string;
  email: string;
  companyId: string;
  role: UserRole;
  branchId: string | null;
  professionalId: string | null;
};

export type JwtAccessPayload = {
  sub: string;
  companyId: string;
  role: UserRole;
  branchId?: string | null;
  professionalId?: string | null;
};
