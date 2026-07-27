import React, { type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { MotiView } from 'moti';
import { useResolvedColorScheme } from './features/theme/state/useThemeStore';

type AppProvidersProps = PropsWithChildren<{
  // Only needed in tests: react-native-safe-area-context can't measure real
  // insets under react-test-renderer, so children relying on them never
  // render without this. See react-native-safe-area-context's testing docs.
  initialSafeAreaMetrics?: Metrics | null;
}>;

export const AppProviders = ({ children, initialSafeAreaMetrics }: AppProvidersProps) => {
  const colorScheme = useResolvedColorScheme();
  const theme = colorScheme === 'dark' ? eva.dark : eva.light;

  return (
    <SafeAreaProvider initialMetrics={initialSafeAreaMetrics}>
      <IconRegistry icons={EvaIconsPack} />
      <ApplicationProvider {...eva} theme={theme}>
        {children}
        {/* Eva/UI Kitten swap every themed color instantly -- there's no
            built-in interpolation for theme tokens (ADR-011 covers Moti as
            our animation lib). Keying this overlay by colorScheme remounts
            just the veil (never `children`, so no data reload/effects
            re-run), fading it from opaque to transparent over the newly
            applied theme's own background to mask the instant swap as a
            crossfade instead of a jarring cut. */}
        <MotiView
          key={colorScheme}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme['background-basic-color-2'] }]}
          from={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          // @ts-expect-error -- moti@0.30.0's types import RN's per-axis
          // transform interfaces (PerspectiveTransform, RotateTransform, ...)
          // by name from 'react-native', but react-native@0.85.3 no longer
          // exports them (StyleSheetTypes.d.ts keeps them private, only
          // exposing the composed TransformsStyle). skipLibCheck hides the
          // resulting broken import inside moti's .d.ts, so those types
          // silently resolve to `any`, which widens MotiTransitionProp's
          // `Partial<Record<keyof Animate, TransitionConfig>>` member into a
          // real index signature -- any literal transition object then
          // fails with "Property 'type' is incompatible with index
          // signature", even a value pre-typed as `MotiTransitionProp`
          // outside JSX. Verified this is a type-only artifact, not a
          // runtime bug: `{ type: 'timing', duration }` is moti's own
          // documented transition shape and behaves correctly at runtime.
          transition={{ type: 'timing', duration: 300 }}
        />
      </ApplicationProvider>
    </SafeAreaProvider>
  );
};

export default AppProviders;
