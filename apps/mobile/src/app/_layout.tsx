import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';

import { AppProviders } from '../AppProviders';
import { setOnSessionExpired } from '../core/http/sessionExpiry';

// Root layout (Expo Router): providers that used to wrap App.tsx now wrap
// every route via <Slot />. See ADR-017. Registers the real navigation
// callback for core/http/sessionExpiry.ts here -- the only place that can
// safely call useRouter() at the app root, and the one file that was always
// going to pay the cost of importing all of 'expo-router' anyway (see that
// module's comment for why apiClient.ts/mcpClient.ts don't import it
// directly).
export const RootLayout = () => {
  const router = useRouter();

  useEffect(() => {
    setOnSessionExpired(() => router.replace('/login'));
    return () => setOnSessionExpired(null);
  }, [router]);

  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
};

export default RootLayout;
