// Helper puro (sin lógica de negocio ni de UI), vive en util/ según ADR-020.
// Espejo de apps/mobile/src/features/menu/util/formatServesRange.ts.
//
// serves_min/serves_max reemplazan el serves_people de un solo entero (ver
// ADR-021): un platillo de catering sirve a un rango de personas. Cuando el
// rango colapsa a un solo valor (min === max) se muestra sin la palabra
// "de...a" -- "Sirve N personas" en vez de "Sirve de N a N personas".
export function formatServesRange(servesMin: number, servesMax: number): string {
  if (servesMin === servesMax) {
    return `${servesMin} ${servesMin === 1 ? 'persona' : 'personas'}`;
  }
  return `De ${servesMin} a ${servesMax} personas`;
}
