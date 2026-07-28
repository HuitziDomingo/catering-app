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
    {/* title alimenta la etiqueta del botón "atrás" del detalle -- sin esto
        cae al nombre de archivo de la ruta ("index"). */}
    <Stack.Screen name="index" options={{ title: 'Menú' }} />
    <Stack.Screen name="[itemId]" options={{ headerShown: true, title: '' }} />
  </Stack>
);

export default MenuStackLayout;
