// Bus mínimo para notificar que la sesión expiró y no se pudo refrescar (ver
// core/http/apiClient.ts, features/chat/data-access/mcpClient.ts). Ninguno
// de esos dos importa 'expo-router' directamente: ese paquete arrastra todo
// su grafo de módulos (Stack nativo, expo-glass-effect, etc.) con solo
// importarlo -- rompe cualquier test que requiera esos archivos sin mockear
// 'expo-router' (ej. useSessionStore.test.ts, useMenuStore.test.ts, que ni
// siquiera tocan sesión/routing), y bajo este preset de Jest ni el import()
// dinámico evita el costo (no hay --experimental-vm-modules configurado).
// RootLayout (la única pieza que de todas formas ya paga el costo real de
// cargar expo-router, al ser la raíz de toda la navegación) registra el
// listener real al arrancar la app.
let listener: (() => void) | null = null;

export function setOnSessionExpired(fn: (() => void) | null): void {
  listener = fn;
}

export function notifySessionExpired(): void {
  listener?.();
}
