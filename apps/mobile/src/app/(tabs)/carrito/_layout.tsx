import React from 'react';
import { Stack } from 'expo-router';

// Stack interno del tab Carrito (ruta delgada de Expo Router, ADR-020).
// Mismo patrón que menu/_layout.tsx: index es el carrito (título en su
// propio JSX, sin header nativo) y checkout entra con header nativo y botón
// "atrás" -- headerBackTitle explícito por la misma razón documentada allá.
export const CartStackLayout = () => (
  <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 500 }}>
    <Stack.Screen name="index" />
    <Stack.Screen
      name="checkout"
      options={{ headerShown: true, title: 'Confirmar pedido', headerBackTitle: 'Carrito' }}
    />
  </Stack>
);

export default CartStackLayout;
