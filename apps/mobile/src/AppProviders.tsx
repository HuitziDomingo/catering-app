import React, { type PropsWithChildren } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';

type AppProvidersProps = PropsWithChildren<{
  // Only needed in tests: react-native-safe-area-context can't measure real
  // insets under react-test-renderer, so children relying on them never
  // render without this. See react-native-safe-area-context's testing docs.
  initialSafeAreaMetrics?: Metrics | null;
}>;

export const AppProviders = ({ children, initialSafeAreaMetrics }: AppProvidersProps) => (
  <SafeAreaProvider initialMetrics={initialSafeAreaMetrics}>
    <IconRegistry icons={EvaIconsPack} />
    <ApplicationProvider {...eva} theme={eva.light}>
      {children}
    </ApplicationProvider>
  </SafeAreaProvider>
);

export default AppProviders;
