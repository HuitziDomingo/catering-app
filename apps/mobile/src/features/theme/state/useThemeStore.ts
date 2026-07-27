import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ColorScheme = 'light' | 'dark';
export type ThemeOverride = ColorScheme | null;

export type ThemeState = {
  // null means "follow the system setting" -- the default until the user
  // explicitly picks a mode.
  override: ThemeOverride;
  setOverride: (override: ThemeOverride) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      override: null,
      setOverride(override) {
        set({ override });
      },
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Resuelve el esquema activo: override manual si existe, si no el del sistema. */
export function useResolvedColorScheme(): ColorScheme {
  const systemScheme = useColorScheme();
  const override = useThemeStore((state) => state.override);
  return override ?? (systemScheme === 'dark' ? 'dark' : 'light');
}
