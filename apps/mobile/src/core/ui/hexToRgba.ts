/**
 * Convierte un color hex de Eva Design (#RRGGBB, sin canal alpha propio) a
 * un string rgba() con la opacidad dada. Los tokens de tema de Eva
 * (theme['background-basic-color-1'], etc.) siempre vienen como hex sólido
 * -- ver ADR-025: se usan como tinte semitransparente sobre BlurView, ya
 * que el `tint` nativo de expo-blur (UIBlurEffect.Style.light/dark en iOS)
 * es un material fijo del sistema que no toma los colores propios del tema.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
