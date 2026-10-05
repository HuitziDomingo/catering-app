// URL de la API cuando no hay EXPO_PUBLIC_API_URL definida (dev local contra
// `nx serve api`, ADR-014). En el emulador de Android, `localhost` apunta al
// propio emulador, no a la Mac -- el host se alcanza vía el alias 10.0.2.2.
// iOS simulator y web sí comparten red con el host, ahí localhost funciona.
// Recibe el OS como parámetro (en vez de leer Platform.OS adentro) para poder
// probarlo sin mockear react-native.
const API_PORT = 3000;
const ANDROID_EMULATOR_HOST = '10.0.2.2';

export function defaultApiUrl(platformOs: string): string {
  const host = platformOs === 'android' ? ANDROID_EMULATOR_HOST : 'localhost';
  return `http://${host}:${API_PORT}/api`;
}
