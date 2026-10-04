import { buildTimeSlots, combineDateAndTime, startOfToday, validateCheckout } from './scheduling';

describe('buildTimeSlots', () => {
  it('va de 07:00 a 22:00 cada 30 minutos', () => {
    const slots = buildTimeSlots();
    expect(slots[0]).toBe('07:00');
    expect(slots[1]).toBe('07:30');
    expect(slots[slots.length - 1]).toBe('22:00');
    expect(slots).toHaveLength(31);
  });
});

describe('combineDateAndTime', () => {
  it('pone la hora local elegida sobre el día, sin mutar la fecha original', () => {
    const day = new Date(2026, 9, 10, 0, 0, 0);
    const combined = combineDateAndTime(day, '18:30');

    expect(combined.getFullYear()).toBe(2026);
    expect(combined.getMonth()).toBe(9);
    expect(combined.getDate()).toBe(10);
    expect(combined.getHours()).toBe(18);
    expect(combined.getMinutes()).toBe(30);
    expect(day.getHours()).toBe(0);
  });
});

describe('startOfToday', () => {
  it('devuelve la medianoche local del día actual', () => {
    const today = startOfToday(new Date(2026, 9, 3, 15, 45));
    expect(today).toEqual(new Date(2026, 9, 3, 0, 0, 0, 0));
  });
});

describe('validateCheckout', () => {
  const now = new Date(2026, 9, 3, 12, 0);
  const tomorrow = new Date(2026, 9, 4);

  it('sin errores con datos completos y fecha futura', () => {
    expect(validateCheckout({ date: tomorrow, time: '09:00', peopleCount: '150' }, now)).toEqual(
      {}
    );
  });

  it('exige fecha, hora y personas', () => {
    expect(validateCheckout({ date: null, time: null, peopleCount: '' }, now)).toEqual({
      date: expect.any(String),
      time: expect.any(String),
      peopleCount: expect.any(String),
    });
  });

  it.each(['0', '-3', '2.5', 'diez'])('rechaza peopleCount inválido (%s)', (peopleCount) => {
    expect(validateCheckout({ date: tomorrow, time: '09:00', peopleCount }, now).peopleCount).toBe(
      'Indica cuántas personas (un número entero mayor a 0).'
    );
  });

  it('rechaza hoy a una hora que ya pasó, y acepta hoy más tarde', () => {
    const today = new Date(2026, 9, 3);
    expect(validateCheckout({ date: today, time: '09:00', peopleCount: '10' }, now).time).toBe(
      'La fecha y hora del evento deben ser futuras.'
    );
    expect(validateCheckout({ date: today, time: '18:00', peopleCount: '10' }, now)).toEqual({});
  });
});
