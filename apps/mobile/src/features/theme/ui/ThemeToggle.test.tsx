import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Toggle } from '@ui-kitten/components';
import { renderWithProviders } from '../../../test-utils';
import { useThemeStore } from '../state/useThemeStore';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  useThemeStore.setState({ override: null });
});

test('toggling switches the stored theme override to dark', () => {
  const { UNSAFE_getByType } = renderWithProviders(<ThemeToggle />);

  const toggle = UNSAFE_getByType(Toggle);
  fireEvent(toggle, 'onChange', true);

  expect(useThemeStore.getState().override).toBe('dark');
});

test('toggling back switches the stored theme override to light', () => {
  useThemeStore.setState({ override: 'dark' });
  const { UNSAFE_getByType } = renderWithProviders(<ThemeToggle />);

  const toggle = UNSAFE_getByType(Toggle);
  fireEvent(toggle, 'onChange', false);

  expect(useThemeStore.getState().override).toBe('light');
});
