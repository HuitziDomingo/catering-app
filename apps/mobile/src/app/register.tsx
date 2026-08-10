import { RegisterScreen } from '../features/auth/feature/RegisterScreen';

// Ruta delgada (Expo Router, ADR-017), fuera del grupo (tabs): la pantalla
// de registro no lleva tab bar. Solo importa y renderiza lo que vive en
// features/, sin lógica de UI/negocio aquí (ver ADR-020).
export const RegisterRoute = RegisterScreen;

export default RegisterRoute;
