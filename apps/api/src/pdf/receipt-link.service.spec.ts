import { GoneException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ReceiptLinkService } from './receipt-link.service';

const SECRET = 'a'.repeat(48);
const orderId = '3f2a9b1c-0000-4000-8000-000000000001';

describe('ReceiptLinkService', () => {
  let env: Record<string, string | undefined>;
  const jwt = new JwtService({});
  const build = () =>
    new ReceiptLinkService(jwt, { get: (key: string) => env[key] } as unknown as ConfigService);

  beforeEach(() => {
    env = { RECEIPT_LINK_SECRET: SECRET, API_PUBLIC_URL: 'https://api.ejemplo.mx/' };
  });

  afterEach(() => jest.useRealTimers());

  it('el token identifica el pedido y vale 30 días', () => {
    const service = build();
    const token = service.createToken(orderId) as string;

    expect(service.verifyToken(token)).toBe(orderId);
    const payload = jwt.decode(token) as { exp: number; iat: number; aud: string };
    expect(payload.exp - payload.iat).toBe(30 * 24 * 60 * 60);
    expect(payload.aud).toBe('receipt-link');
  });

  it('un token caducado responde 410', () => {
    jest.useFakeTimers({ now: new Date('2026-10-01T00:00:00Z') });
    const token = build().createToken(orderId) as string;
    jest.setSystemTime(new Date('2026-11-01T00:00:00Z'));

    expect(() => build().verifyToken(token)).toThrow(GoneException);
  });

  it('un token firmado con otro secreto (o un JWT de sesión) responde 404', () => {
    const foreign = jwt.sign({ sub: orderId }, { secret: 'b'.repeat(48), audience: 'receipt-link' });
    const sessionLike = jwt.sign({ sub: orderId }, { secret: SECRET });

    expect(() => build().verifyToken(foreign)).toThrow(NotFoundException);
    // Mismo secreto pero sin la audiencia del link: tampoco sirve.
    expect(() => build().verifyToken(sessionLike)).toThrow(NotFoundException);
    expect(() => build().verifyToken('no-es-un-jwt')).toThrow(NotFoundException);
  });

  it('buildShareUrl arma la URL pública sin doble barra', () => {
    const url = build().buildShareUrl(orderId) as string;

    expect(url).toMatch(/^https:\/\/api\.ejemplo\.mx\/api\/receipts\/[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('sin RECEIPT_LINK_SECRET no hay token ni link, y verificar responde 404', () => {
    env.RECEIPT_LINK_SECRET = undefined;
    const service = build();

    expect(service.createToken(orderId)).toBeNull();
    expect(service.buildShareUrl(orderId)).toBeNull();
    expect(() => service.verifyToken('x.y.z')).toThrow(NotFoundException);
  });

  it('sin API_PUBLIC_URL no hay link para compartir', () => {
    env.API_PUBLIC_URL = undefined;

    expect(build().buildShareUrl(orderId)).toBeNull();
  });
});
