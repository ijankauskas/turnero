import { ForbiddenException } from '@nestjs/common';
import { assertBranchAccess, assertProfessionalSelf } from './scope';
import type { AuthenticatedUser } from '../auth/auth.types';

const admin: AuthenticatedUser = {
  id: '1',
  email: 'a@x',
  companyId: 'c1',
  role: 'ADMINISTRADOR',
  branchId: null,
  professionalId: null,
};

const encargado: AuthenticatedUser = {
  ...admin,
  id: '2',
  role: 'ENCARGADO',
  branchId: 'b1',
};

const juan: AuthenticatedUser = {
  ...admin,
  id: '3',
  role: 'PROFESIONAL',
  professionalId: 'p-juan',
};

describe('scope helpers', () => {
  it('lets admin see any branch and blocks encargado from another', () => {
    expect(() => assertBranchAccess(admin, 'b9')).not.toThrow();
    expect(() => assertBranchAccess(encargado, 'b1')).not.toThrow();
    expect(() => assertBranchAccess(encargado, 'b2')).toThrow(
      ForbiddenException,
    );
  });

  it('blocks Juan from Noelia (AUTH-003 helper)', () => {
    expect(() => assertProfessionalSelf(juan, 'p-juan')).not.toThrow();
    expect(() => assertProfessionalSelf(juan, 'p-noelia')).toThrow(
      ForbiddenException,
    );
    expect(() => assertProfessionalSelf(admin, 'p-noelia')).not.toThrow();
  });
});
