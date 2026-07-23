import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { JwtPayload } from '../jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const buildContext = (user?: JwtPayload): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows the request when the route has no @Roles metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('allows the request when the user has one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff', 'admin']);

    const context = buildContext({
      sub: 'user-1',
      email: 'staff@example.com',
      role: 'admin',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies the request when the user role is not in the required list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff', 'admin']);

    const context = buildContext({
      sub: 'user-1',
      email: 'customer@example.com',
      role: 'customer',
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies the request when there is no authenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['staff', 'admin']);

    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
