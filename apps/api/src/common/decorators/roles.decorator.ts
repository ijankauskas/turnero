import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@turnero/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const SCOPE_KEY = 'accessScope';
export type AccessScope = 'company' | 'branch' | 'self';
export const Scoped = (scope: AccessScope) => SetMetadata(SCOPE_KEY, scope);
