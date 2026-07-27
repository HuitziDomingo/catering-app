import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Toggle } from '@ui-kitten/components';
import { useResolvedColorScheme, useThemeStore } from '../state/useThemeStore';

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. El override manual vive en el store del feature; este componente
// solo lee/escribe el estado resuelto.
export const ThemeToggle = () => {
  const resolved = useResolvedColorScheme();
  const setOverride = useThemeStore((state) => state.setOverride);
  const isDark = resolved === 'dark';

  return (
    <View style={styles.container} testID="theme-toggle">
      <Text appearance="hint" category="c1">
        {isDark ? 'Oscuro' : 'Claro'}
      </Text>
      <Toggle
        testID="theme-toggle-switch"
        checked={isDark}
        onChange={(checked) => setOverride(checked ? 'dark' : 'light')}
      />
    </View>
  );
};

export default ThemeToggle;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
