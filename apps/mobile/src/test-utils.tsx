import * as React from 'react';
import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { AppProviders } from './AppProviders';

// react-native-safe-area-context can't measure real insets under
// react-test-renderer, so it needs fixed metrics to render synchronously.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export const renderWithProviders = (ui: ReactElement): RenderResult =>
  render(
    <AppProviders initialSafeAreaMetrics={TEST_SAFE_AREA_METRICS}>{ui}</AppProviders>
  );
