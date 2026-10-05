// Helpers de fecha/hora del checkout. La fecha sale del Datepicker de UI
// Kitten (solo día) y la hora de un Select de horarios fijos -- evita una
// dependencia nativa de time picker (que obligaría a recompilar el Dev
// Client, ADR-015) para algo que en catering se agenda por bloques.

const FIRST_SLOT_HOUR = 7;
const LAST_SLOT_HOUR = 22;
const SLOT_MINUTES = 30;

/** Horarios "HH:mm" de 07:00 a 22:00 cada 30 minutos. */
export function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = FIRST_SLOT_HOUR; hour <= LAST_SLOT_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      if (hour === LAST_SLOT_HOUR && minute > 0) break;
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return slots;
}

/** Combina el día elegido con un horario "HH:mm" en hora local del dispositivo. */
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** Inicio del día de hoy (local): mínimo seleccionable en el Datepicker. */
export function startOfToday(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

export type CheckoutInput = {
  date: Date | null;
  time: string | null;
  peopleCount: string;
};

export type CheckoutErrors = Partial<Record<'date' | 'time' | 'peopleCount', string>>;

/**
 * Valida el formulario de checkout. La API exige peopleCount entero >= 1 y
 * scheduledFor ISO; que la fecha sea futura lo pide ADR-023 y se valida acá
 * (con la hora ya combinada, para no aceptar "hoy a una hora que ya pasó").
 */
export function validateCheckout(input: CheckoutInput, now: Date = new Date()): CheckoutErrors {
  const errors: CheckoutErrors = {};

  const people = Number(input.peopleCount);
  if (!input.peopleCount.trim() || !Number.isInteger(people) || people < 1) {
    errors.peopleCount = 'Indica cuántas personas (un número entero mayor a 0).';
  }
  if (!input.date) {
    errors.date = 'Elige la fecha del evento.';
  }
  if (!input.time) {
    errors.time = 'Elige la hora del evento.';
  }
  if (input.date && input.time && combineDateAndTime(input.date, input.time) <= now) {
    errors.time = 'La fecha y hora del evento deben ser futuras.';
  }

  return errors;
}
