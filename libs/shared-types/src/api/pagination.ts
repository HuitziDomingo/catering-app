/** Respuesta paginada genérica de los endpoints de listado (ver ADR-027). */
export interface Paginated<T> {
  items: T[];
  /** Total de registros que cumplen el filtro (no solo los de esta página). */
  total: number;
  /** Página actual, empezando en 1. */
  page: number;
  pageSize: number;
}
