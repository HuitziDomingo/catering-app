import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Text } from '@ui-kitten/components';
import type { MenuItem } from '@catering-app/shared-types';
import { MenuItemCard } from './MenuItemCard';

type MenuItemListProps = {
  items: MenuItem[];
};

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. Recibe la lista ya filtrada por categoría (filtrado vive en el
// store, no aquí).
export const MenuItemList = ({ items }: MenuItemListProps) => (
  <FlatList
    testID="menu-item-list"
    data={items}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <MenuItemCard item={item} />}
    contentContainerStyle={styles.content}
    ListEmptyComponent={
      <Text appearance="hint" style={styles.empty}>
        No hay platillos en esta categoría.
      </Text>
    }
  />
);

export default MenuItemList;

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
});
