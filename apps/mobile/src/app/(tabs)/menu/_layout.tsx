import React from 'react';
import { Stack } from 'expo-router';

// Stack interno del tab Menú (ver ADR-020: ruta delgada de Expo Router).
// index.tsx es la lista de platillos; [itemId].tsx es el detalle -- ambas
// comparten este stack para tener header nativo con botón "atrás" al entrar
// al detalle.
export const MenuStackLayout = () => (
  <Stack screenOptions={{ headerShown: false }}>
    {/* title alimenta la etiqueta del botón "atrás" del detalle -- sin esto
        cae al nombre de archivo de la ruta ("index"). */}
    <Stack.Screen name="index" options={{ title: 'Menú' }} />
    <Stack.Screen name="[itemId]" options={{ headerShown: true, title: '' }} />
  </Stack>
);

export default MenuStackLayout;
