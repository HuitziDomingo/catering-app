import type { MenuItem } from '@catering-app/shared-types';

// Extracción básica de patrones para crear_pedido (ADR-023) -- NO es NLU
// real: coincidencia simple de nombre de platillo contra el store de menú ya
// cargado, regex de número + "persona(s)", y un puñado de expresiones de
// fecha comunes en español ("en N días", "mañana", fecha explícita). Si la
// extracción falla o es ambigua, ChatScreen pide aclaración al usuario en
// vez de adivinar y crear un pedido incorrecto (ver ADR-023).
//
// Se evaluó chrono-node (única librería de parseo de fechas en español
// razonablemente ligera) para la parte de fechas, pero su locale `es` no
// reconoce expresiones sin tilde ("dias", "manana") -- muy común al escribir
// desde el teléfono -- y el patrón real necesario (sumar N días, o construir
// una fecha explícita) es aritmética de calendario trivial con `Date`
// nativo, sin casos borde de zona horaria o negocio que justifiquen la
// dependencia. Por eso esta v1 no agrega una librería de fechas.

export type ExtractedOrderIntent = {
  menuItem: MenuItem;
  peopleCount: number;
  /** ISO 8601 en UTC, siempre futura respecto al `now` usado en la extracción. */
  scheduledFor: string;
};

export type OrderIntentExtractionFailureReason =
  | 'no-menu-item-match'
  | 'ambiguous-menu-item'
  | 'no-people-count'
  | 'no-date'
  | 'date-not-future';

export type OrderIntentExtractionResult =
  | { ok: true; intent: ExtractedOrderIntent }
  | { ok: false; reason: OrderIntentExtractionFailureReason };

const MONTH_NAMES: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

const MEAL_HOURS: Array<{ keyword: string; hour: number }> = [
  { keyword: 'desayuno', hour: 9 },
  { keyword: 'almuerzo', hour: 13 },
  { keyword: 'comida', hour: 14 },
  { keyword: 'cena', hour: 20 },
];

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(value: string): string {
  return stripAccents(value.toLowerCase());
}

function findMealHour(normalizedMessage: string): number {
  const match = MEAL_HOURS.find(({ keyword }) => normalizedMessage.includes(keyword));
  return match?.hour ?? 12;
}

function atHour(date: Date, hour: number): Date {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result;
}

/**
 * Busca el nombre de platillo cuya coincidencia (substring, ver ADR-023) sea
 * más larga -- evita que un platillo con nombre corto ("Agua") haga match
 * de más contra un mensaje que en realidad pide otro platillo más
 * específico. Si dos platillos distintos empatan en la coincidencia más
 * larga, es ambiguo.
 */
function matchMenuItem(
  normalizedMessage: string,
  menuItems: MenuItem[],
): MenuItem | 'ambiguous' | undefined {
  const matches = menuItems.filter((item) =>
    normalizedMessage.includes(normalize(item.name)),
  );
  if (matches.length === 0) {
    return undefined;
  }

  const maxLength = Math.max(...matches.map((item) => item.name.length));
  const longestMatches = matches.filter((item) => item.name.length === maxLength);
  if (longestMatches.length > 1) {
    return 'ambiguous';
  }
  return longestMatches[0];
}

function extractPeopleCount(message: string): number | undefined {
  const match = message.match(/(\d+)\s*personas?/i);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function extractScheduledFor(normalizedMessage: string, now: Date): Date | undefined {
  const hour = findMealHour(normalizedMessage);

  const relativeMatch = normalizedMessage.match(/\ben\s+(\d+)\s+dias?\b/);
  if (relativeMatch) {
    const days = Number(relativeMatch[1]);
    const result = new Date(now);
    result.setDate(result.getDate() + days);
    return atHour(result, hour);
  }

  if (/\bmanana\b/.test(normalizedMessage)) {
    const result = new Date(now);
    result.setDate(result.getDate() + 1);
    return atHour(result, hour);
  }

  const numericMatch = normalizedMessage.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    return atHour(new Date(Number(year), Number(month) - 1, Number(day)), hour);
  }

  const isoMatch = normalizedMessage.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return atHour(new Date(Number(year), Number(month) - 1, Number(day)), hour);
  }

  const monthNameMatch = normalizedMessage.match(
    /\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/,
  );
  if (monthNameMatch) {
    const [, day, monthName, year] = monthNameMatch;
    const monthIndex = MONTH_NAMES[monthName];
    if (monthIndex !== undefined) {
      const resolvedYear = year ? Number(year) : now.getFullYear();
      let result = new Date(resolvedYear, monthIndex, Number(day));
      // Sin año explícito y la fecha ya pasó este año: asume el próximo año
      // (ej. "el 5 de enero" dicho en diciembre se refiere al enero siguiente).
      if (!year && atHour(result, hour).getTime() < now.getTime()) {
        result = new Date(resolvedYear + 1, monthIndex, Number(day));
      }
      return atHour(result, hour);
    }
  }

  return undefined;
}

export function extractOrderIntent(
  message: string,
  menuItems: MenuItem[],
  now: Date = new Date(),
): OrderIntentExtractionResult {
  const normalizedMessage = normalize(message);

  const menuItemMatch = matchMenuItem(normalizedMessage, menuItems);
  if (menuItemMatch === undefined) {
    return { ok: false, reason: 'no-menu-item-match' };
  }
  if (menuItemMatch === 'ambiguous') {
    return { ok: false, reason: 'ambiguous-menu-item' };
  }

  const peopleCount = extractPeopleCount(message);
  if (peopleCount === undefined) {
    return { ok: false, reason: 'no-people-count' };
  }

  const scheduledForDate = extractScheduledFor(normalizedMessage, now);
  if (!scheduledForDate) {
    return { ok: false, reason: 'no-date' };
  }
  if (scheduledForDate.getTime() <= now.getTime()) {
    return { ok: false, reason: 'date-not-future' };
  }

  return {
    ok: true,
    intent: {
      menuItem: menuItemMatch,
      peopleCount,
      scheduledFor: scheduledForDate.toISOString(),
    },
  };
}
