import React from 'react';
import { Slot } from 'expo-router';

import { AppProviders } from '../AppProviders';

// Root layout (Expo Router): providers that used to wrap App.tsx now wrap
// every route via <Slot />. See ADR-017.
export const RootLayout = () => (
  <AppProviders>
    <Slot />
  </AppProviders>
);

export default RootLayout;
