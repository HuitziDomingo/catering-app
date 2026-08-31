import React from 'react';
import { View } from 'react-native';
import { BottomNavigation, BottomNavigationTab, Icon, useTheme } from '@ui-kitten/components';
import { BlurView } from 'expo-blur';
import { hexToRgba } from '../../../core/ui/hexToRgba';
import { useResolvedColorScheme } from '../../theme/state/useThemeStore';
import { styles } from './TabBar.styles';

export type TabBarItem = {
  title: string;
  icon: string;
};

type TabBarProps = {
  items: TabBarItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

// Componente de presentación pura (sin lógica de navegación), vive en ui/
// según ADR-020. El layout de rutas (app/(tabs)/_layout.tsx) traduce el
// estado de React Navigation a estas props simples.
//
// Acento de vidrio (ADR-025): BlurView reemplaza el fondo sólido de
// BottomNavigation por un fondo esmerilado translúcido (intensidad
// moderada -- ver TabBar.styles.ts/BlurView.types para el rango). El tint
// nativo de BlurView (light/dark) es un material fijo de iOS que no toma
// los colores propios de Eva -- en modo oscuro se ve como un gris genérico
// de Apple, no el navy del tema. Por eso se suma una capa semitransparente
// con el color real de Eva (background-basic-color-1 vía hexToRgba) encima
// del blur nativo: el resultado es un vidrio esmerilado con el tinte del
// tema, no del sistema. Igual que ThemeToggle, useResolvedColorScheme
// decide claro/oscuro. El wrapper en _layout.tsx ya no pinta un fondo
// sólido detrás -- lo haría, taparía el blur.
export const TabBar = ({ items, selectedIndex, onSelect }: TabBarProps) => {
  const resolved = useResolvedColorScheme();
  const theme = useTheme();

  return (
    <BlurView
      tint={resolved === 'dark' ? 'dark' : 'light'}
      intensity={40}
      style={[styles.blur, { borderTopColor: theme['border-basic-color-3'] }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.tint,
          { backgroundColor: hexToRgba(theme['background-basic-color-1'], 0.6) },
        ]}
      />
      <BottomNavigation
        testID="app-tab-bar"
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        style={styles.navigation}
      >
        {items.map((item) => (
          <BottomNavigationTab
            key={item.title}
            title={item.title}
            icon={(props) => <Icon {...props} name={item.icon} />}
          />
        ))}
      </BottomNavigation>
    </BlurView>
  );
};

export default TabBar;
