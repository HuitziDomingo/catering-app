import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from './useThemeStore';

// AsyncStorage is mocked via jest.config.cts moduleNameMapper (the package's
// own documented in-memory mock) -- no native module bindings needed here.

beforeEach(async () => {
  await AsyncStorage.clear();
  useThemeStore.setState({ override: null });
});

test('setOverride updates the resolved override in the store', () => {
  useThemeStore.getState().setOverride('dark');
  expect(useThemeStore.getState().override).toBe('dark');

  useThemeStore.getState().setOverride('light');
  expect(useThemeStore.getState().override).toBe('light');
});

test('setOverride(null) clears the override, falling back to the system scheme', () => {
  useThemeStore.getState().setOverride('dark');
  useThemeStore.getState().setOverride(null);
  expect(useThemeStore.getState().override).toBeNull();
});

test('persists the chosen override to storage', async () => {
  useThemeStore.getState().setOverride('dark');

  await waitForStorageWrite();

  const stored = await AsyncStorage.getItem('theme-preference');
  expect(stored).not.toBeNull();
  expect(JSON.parse(stored as string).state.override).toBe('dark');
});

test('rehydrates a previously persisted override from storage', async () => {
  await AsyncStorage.setItem(
    'theme-preference',
    JSON.stringify({ state: { override: 'dark' }, version: 0 })
  );

  await useThemeStore.persist.rehydrate();

  expect(useThemeStore.getState().override).toBe('dark');
});

// zustand's persist middleware writes to storage asynchronously after a
// state change; flush pending microtasks before asserting on it.
function waitForStorageWrite() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
