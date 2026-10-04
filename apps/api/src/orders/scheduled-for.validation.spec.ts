import { BadRequestException } from '@nestjs/common';
import {
  assertScheduledForInFuture,
  isFutureDate,
  SCHEDULED_FOR_IN_PAST_MESSAGE,
} from './scheduled-for.validation';

describe('scheduled-for.validation', () => {
  const now = new Date('2026-10-04T12:00:00.000Z');

  describe('isFutureDate', () => {
    it('true para una fecha posterior a ahora (string ISO o Date)', () => {
      expect(isFutureDate('2026-10-04T12:00:01.000Z', now)).toBe(true);
      expect(isFutureDate(new Date('2027-01-01T00:00:00.000Z'), now)).toBe(true);
    });

    it('false para ahora mismo o el pasado', () => {
      expect(isFutureDate('2026-10-04T12:00:00.000Z', now)).toBe(false);
      expect(isFutureDate('2026-08-01T18:00:00.000Z', now)).toBe(false);
    });

    it('false para una fecha inválida', () => {
      expect(isFutureDate('mañana', now)).toBe(false);
    });

    it('respeta el offset de zona horaria del string', () => {
      // 06:30 en CDMX (-06:00) = 12:30 UTC, posterior a las 12:00 UTC.
      expect(isFutureDate('2026-10-04T06:30:00-06:00', now)).toBe(true);
    });
  });

  describe('assertScheduledForInFuture', () => {
    it('lanza BadRequestException (400) con el mensaje claro si la fecha no es futura', () => {
      expect(() => assertScheduledForInFuture('2026-08-01T18:00:00.000Z', now)).toThrow(
        new BadRequestException(SCHEDULED_FOR_IN_PAST_MESSAGE),
      );
    });

    it('no lanza para una fecha futura', () => {
      expect(() => assertScheduledForInFuture('2026-10-05T09:00:00.000Z', now)).not.toThrow();
    });
  });
});
