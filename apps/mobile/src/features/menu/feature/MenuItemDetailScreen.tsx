import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, useTheme } from '@ui-kitten/components';
import { selectMenuItemById, useMenuStore } from '../state/useMenuStore';
import { MenuItemDetail } from '../ui/MenuItemDetail';
import { useCartStore } from '../../cart/state/useCartStore';
import { AddToCartBar } from '../../cart/ui/AddToCartBar';

// Pantalla del feature de menú (ver ADR-020): conecta el store (filtrado en
// cliente vía selectMenuItemById -- ver esa función para el porqué de no
// pedir un endpoint GET /menu/items/:id) con el componente de presentación
// de ui/. La barra de "Agregar" viene del feature de carrito: esta pantalla
// es la que ensambla ambos, así MenuItemDetail (ui/ pura) no sabe nada del
// carrito.
export const MenuItemDetailScreen = () => {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const item = useMenuStore(selectMenuItemById(itemId));
  const categories = useMenuStore((state) => state.categories);
  const addItem = useCartStore((state) => state.addItem);
  const quantityInCart = useCartStore(
    (state) => state.lines.find((line) => line.menuItemId === itemId)?.quantity ?? 0
  );
  const theme = useTheme();
  const router = useRouter();

  const categoryName = item
    ? categories.find((category) => category.id === item.categoryId)?.name ?? null
    : null;

  return (
    <>
      <Stack.Screen options={{ title: item?.name ?? 'Detalle' }} />
      {item ? (
        <View style={styles.flex}>
          <MenuItemDetail item={item} categoryName={categoryName} />
          <AddToCartBar
            unitPrice={Number(item.basePrice)}
            servesMin={item.servesMin}
            servesMax={item.servesMax}
            quantityInCart={quantityInCart}
            onAdd={(quantity) => addItem(item, quantity)}
            onViewCart={() => router.navigate('/carrito')}
          />
        </View>
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
  flex: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
