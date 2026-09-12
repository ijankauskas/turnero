import { Test } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function contextWith(user: { role: string } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user, method: 'PATCH', url: '/company' }),
    }),
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  it('rejects RECEPCION on admin-only routes (AUTH-002)', () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ROLES_KEY) return ['ADMINISTRADOR'];
        return undefined;
      },
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() =>
      guard.canActivate(contextWith({ role: 'RECEPCION' })),
    ).toThrow(ForbiddenException);
  });

  it('allows ADMINISTRADOR', () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ROLES_KEY) return ['ADMINISTRADOR'];
        return undefined;
      },
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWith({ role: 'ADMINISTRADOR' }))).toBe(
      true,
    );
  });
});
