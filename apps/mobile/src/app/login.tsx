import { LoginScreen } from '../features/auth/feature/LoginScreen';

// Ruta delgada (Expo Router, ADR-017), fuera del grupo (tabs): la pantalla
// de login no lleva tab bar. Solo importa y renderiza lo que vive en
// features/, sin lógica de UI/negocio aquí (ver ADR-020).
export const LoginRoute = LoginScreen;

export default LoginRoute;
