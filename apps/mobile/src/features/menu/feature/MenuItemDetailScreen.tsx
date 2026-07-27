import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, useTheme } from '@ui-kitten/components';
import { selectMenuItemById, useMenuStore } from '../state/useMenuStore';
import { MenuItemDetail } from '../ui/MenuItemDetail';

// Pantalla del feature de menú (ver ADR-020): conecta el store (filtrado en
// cliente vía selectMenuItemById -- ver esa función para el porqué de no
// pedir un endpoint GET /menu/items/:id) con el componente de presentación
// de ui/.
export const MenuItemDetailScreen = () => {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const item = useMenuStore(selectMenuItemById(itemId));
  const categories = useMenuStore((state) => state.categories);
  const theme = useTheme();

  const categoryName = item
    ? categories.find((category) => category.id === item.categoryId)?.name ?? null
    : null;

  return (
    <>
      <Stack.Screen options={{ title: item?.name ?? 'Detalle' }} />
      {item ? (
        <MenuItemDetail item={item} categoryName={categoryName} />
      ) : (
        <View style={[styles.notFound, { backgroundColor: theme['background-basic-color-2'] }]}>
          <Text appearance="hint" testID="menu-item-detail-not-found">
            No se encontró el platillo.
          </Text>
        </View>
      )}
    </>
  );
};

export default MenuItemDetailScreen;

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
