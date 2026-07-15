/** Contenido de los JWT propios emitidos por la API (ADR-010). */
export interface JwtPayload {
  /** user.id (uuid) */
  sub: string;
  email: string;
  /** nombre del rol (customer / staff / admin / superadmin) */
  role: string;
}
