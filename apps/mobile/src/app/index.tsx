import { Redirect } from 'expo-router';

// La ruta raíz ("/") no coincide con ningún tab por sí sola: (tabs) es un
// grupo (no agrega segmento) pero la carpeta menu/ sí, así que el Menú real
// vive en "/menu". Esta ruta redirige "/" ahí -- es el landing real de la
// app (ver ADR-017/ADR-020).
export const RootIndex = () => <Redirect href="/menu" />;

export default RootIndex;
