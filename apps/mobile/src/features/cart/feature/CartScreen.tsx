import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { formatCurrency } from '../../../core/ui/formatCurrency';
import { useMenuStore } from '../../menu/state/useMenuStore';
import { selectSubtotal, useCartStore } from '../state/useCartStore';
import { CartLineItem } from '../ui/CartLineItem';
import { resolveCartLineImage } from '../util/resolveCartLineImage';

// Pantalla del carrito (ADR-020): conecta useCartStore con las líneas de
// ui/. El subtotal es un estimado con los precios al agregar; el total real
// lo calcula la API al crear el pedido.
export const CartScreen = () => {
  const lines = useCartStore((state) => state.lines);
  const subtotal = useCartStore(selectSubtotal);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const menuItems = useMenuStore((state) => state.items);
  const menuStatus = useMenuStore((state) => state.status);
  const loadMenu = useMenuStore((state) => state.load);
  const theme = useTheme();
  const router = useRouter();

  // El carrito persiste entre aperturas de la app: si se abre directo aquí,
  // el menú no está cargado y las imágenes guardadas pueden estar vencidas.
  // Cargarlo trae las vigentes (resolveCartLineImage).
  const hasLines = lines.length > 0;
  useEffect(() => {
    if (hasLines && menuStatus === 'idle') {
      void loadMenu();
    }
  }, [hasLines, menuStatus, loadMenu]);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <Text category="h5" style={styles.title}>
        Carrito
      </Text>

      {lines.length === 0 ? (
        <View style={styles.empty} testID="cart-empty">
          <Text appearance="hint" style={styles.emptyText}>
            Tu carrito está vacío.
          </Text>
          <Button appearance="outline" onPress={() => router.navigate('/menu')}>
            Ver menú
          </Button>
        </View>
      ) : (
        <>
          <FlatList
            testID="cart-lines"
            data={lines}
            keyExtractor={(line) => line.menuItemId}
            contentContainerStyle={styles.list}
            renderItem={({ item: line }) => (
              <CartLineItem
                line={line}
                imageUrl={resolveCartLineImage(line, menuItems)}
                onChangeQuantity={(quantity) => setQuantity(line.menuItemId, quantity)}
                onRemove={() => removeItem(line.menuItemId)}
              />
            )}
          />
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme['background-basic-color-1'],
                borderTopColor: theme['border-basic-color-3'],
              },
            ]}
          >
            <View style={styles.subtotalRow}>
              <Text category="s1">Subtotal estimado</Text>
              <Text category="h6" testID="cart-subtotal">
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <Button testID="cart-checkout" onPress={() => router.push('/carrito/checkout')}>
              Continuar
            </Button>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginBottom: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
