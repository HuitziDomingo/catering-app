import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Text } from '@ui-kitten/components';
import { MotiView } from 'moti';
import type { MenuItem } from '@catering-app/shared-types';
import { MenuItemCard } from './MenuItemCard';

type MenuItemListProps = {
  items: MenuItem[];
  onItemPress?: (item: MenuItem) => void;
};

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. Recibe la lista ya filtrada por categoría (filtrado vive en el
// store, no aquí).
//
// El MotiView envuelve la lista completa (no cada MenuItemCard por
// separado) para evitar que el fade-in se repita cada vez que FlatList
// recicla celdas al hacer scroll -- solo anima una vez, al montar, que es
// justo el momento en que MenuScreen pasa de loading a success (ver
// MenuScreen.tsx). Mismo timing/duración que el resto de la app (300-500ms,
// sin springs) -- ver AppProviders.tsx y ThemeToggle.tsx.
export const MenuItemList = ({ items, onItemPress }: MenuItemListProps) => (
  <MotiView
    style={styles.flex}
    from={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    // @ts-expect-error -- ver AppProviders.tsx: moti@0.30.0's types import
    // RN's per-axis transform interfaces by name from 'react-native', which
    // react-native@0.85.3 no longer exports.
    transition={{ type: 'timing', duration: 500 }}
  >
    <FlatList
      testID="menu-item-list"
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MenuItemCard item={item} onPress={onItemPress} />}
      contentContainerStyle={styles.content}
      ListEmptyComponent={
        <Text appearance="hint" style={styles.empty}>
          No hay platillos en esta categoría.
        </Text>
      }
    />
  </MotiView>
);

export default MenuItemList;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
});
