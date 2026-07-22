import * as React from 'react';
import { render } from '@testing-library/react-native';

import { AppProviders } from './AppProviders';
import Index from './app/index';

// react-native-safe-area-context can't measure real insets under
// react-test-renderer, so it needs fixed metrics to render synchronously.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

test('renders the mobile skeleton with the UI Kitten button', () => {
  const { getByText, getByTestId } = render(
    <AppProviders initialSafeAreaMetrics={TEST_SAFE_AREA_METRICS}>
      <Index />
    </AppProviders>
  );
  expect(getByTestId('heading')).toHaveTextContent(/Catering/);
  expect(getByText('Probar UI Kitten + Moti')).toBeTruthy();
});
