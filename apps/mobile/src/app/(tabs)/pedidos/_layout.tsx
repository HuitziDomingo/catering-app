import React from 'react';
import { Stack } from 'expo-router';

// Stack interno del tab Pedidos (ruta delgada de Expo Router, ADR-020).
// Mismo patrón que menu/_layout.tsx: index es "Mis pedidos" (título en su
// propio JSX) y el detalle entra con header nativo y botón "atrás".
export const OrdersStackLayout = () => (
  <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 500 }}>
    <Stack.Screen name="index" />
    <Stack.Screen
      name="[orderId]"
      options={{ headerShown: true, title: 'Pedido', headerBackTitle: 'Pedidos' }}
    />
  </Stack>
);

export default OrdersStackLayout;
