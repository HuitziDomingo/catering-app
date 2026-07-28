import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Icon, Toggle } from '@ui-kitten/components';
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

test('shows the sun icon in light mode', () => {
  useThemeStore.setState({ override: 'light' });
  const { UNSAFE_getByType } = renderWithProviders(<ThemeToggle />);

  expect(UNSAFE_getByType(Icon).props.name).toBe('sun-outline');
});

test('shows the moon icon in dark mode', () => {
  useThemeStore.setState({ override: 'dark' });
  const { UNSAFE_getByType } = renderWithProviders(<ThemeToggle />);

  expect(UNSAFE_getByType(Icon).props.name).toBe('moon-outline');
});
