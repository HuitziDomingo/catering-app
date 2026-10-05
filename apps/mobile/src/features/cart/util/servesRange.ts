// Aviso de rango serves_min/serves_max antes de confirmar (ADR-021). Misma
// regla que OrdersService.createOrder en la API: el pedido está "en rango"
// si peopleCount cae dentro del rango de AL MENOS UNO de los platillos. Si
// no, la API lo crea igual con needsReview = true (ADR-023) -- por eso acá
// es un aviso, no un bloqueo.

export type ServesRange = { name: string; servesMin: number; servesMax: number };

export function isWithinAnyServesRange(ranges: ServesRange[], peopleCount: number): boolean {
  return ranges.some(
    (range) => peopleCount >= range.servesMin && peopleCount <= range.servesMax
  );
}

/** Texto del aviso: qué rango cubre cada platillo del carrito. */
export function describeServesRanges(ranges: ServesRange[]): string {
  return ranges
    .map((range) =>
      range.servesMin === range.servesMax
        ? `${range.name}: ${range.servesMin} personas`
        : `${range.name}: ${range.servesMin}–${range.servesMax} personas`
    )
    .join('\n');
}
