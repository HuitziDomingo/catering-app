import React from 'react';
import { Stack } from 'expo-router';

// Stack interno del tab Menú (ver ADR-020: ruta delgada de Expo Router).
// index.tsx es la lista de platillos; [itemId].tsx es el detalle -- ambas
// comparten este stack para tener header nativo con botón "atrás" al entrar
// al detalle.
//
// animation: 'fade' + animationDuration: 500 hace la transición entre
// pantallas consistente con el velo de crossfade de AppProviders.tsx (misma
// familia: fundido con timing, sin springs/rebotes) en vez de un slide que
// introduciría un estilo de animación distinto. animationDuration solo
// controla la duración en iOS para 'fade' (ver tipos de
// react-native-screens); Android usa su propia duración de fade.
export const MenuStackLayout = () => (
  <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 500 }}>
    <Stack.Screen name="index" />
    {/* headerBackTitle explícito -- react-native-screens deriva el título
        del botón "atrás" del header NATIVO de la pantalla anterior, no de
        su opción `title`. Como index tiene headerShown: false (su título
        vive en el JSX de MenuScreen.tsx, no en un header nativo), no hay
        ningún header nativo previo del que heredar texto, así que
        react-native-screens cae a un "Back" genérico -- confirmado
        forzando headerShown: true en index como prueba: con el header
        nativo visible ahí, el back button sí hereda "Menú" correctamente.
        headerBackTitle evita depender de esa herencia sin tener que
        mostrar (y duplicar) el header nativo de la lista. */}
    <Stack.Screen
      name="[itemId]"
      options={{ headerShown: true, title: '', headerBackTitle: 'Menú' }}
    />
  </Stack>
);

export default MenuStackLayout;
