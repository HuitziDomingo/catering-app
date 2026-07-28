import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Toggle, useTheme } from '@ui-kitten/components';
import { MotiView } from 'moti';
import { useResolvedColorScheme, useThemeStore } from '../state/useThemeStore';

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. El override manual vive en el store del feature; este componente
// solo lee/escribe el estado resuelto.
//
// El ícono sol/luna reemplaza la etiqueta de texto "Oscuro"/"Claro". Igual
// que el velo de crossfade de AppProviders.tsx (mismo patrón: MotiView
// clave por estado, timing 300ms), key={resolved} fuerza que Moti remonte
// el MotiView en cada cambio de tema y anime desde "from" -- rotación +
// fade en vez de un corte instantáneo entre los dos íconos.
export const ThemeToggle = () => {
  const resolved = useResolvedColorScheme();
  const setOverride = useThemeStore((state) => state.setOverride);
  const theme = useTheme();
  const isDark = resolved === 'dark';

  return (
    <View style={styles.container} testID="theme-toggle">
      <MotiView
        key={resolved}
        testID="theme-toggle-icon"
        from={{ opacity: 0, rotate: '-90deg' }}
        animate={{ opacity: 1, rotate: '0deg' }}
        // @ts-expect-error -- ver AppProviders.tsx: moti@0.30.0's types
        // import RN's per-axis transform interfaces by name from
        // 'react-native', which react-native@0.85.3 no longer exports.
        transition={{ type: 'timing', duration: 300 }}
      >
        <Icon
          name={isDark ? 'moon-outline' : 'sun-outline'}
          fill={theme['text-hint-color']}
          style={styles.icon}
        />
      </MotiView>
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
  icon: {
    width: 20,
    height: 20,
  },
});
