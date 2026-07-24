import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from '@ui-kitten/components';
import type { MenuItem } from '@catering-app/shared-types';

type MenuItemCardProps = {
  item: MenuItem;
};

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. Recibe un MenuItem ya resuelto -- no llama a data-access ni al
// store directamente.
export const MenuItemCard = ({ item }: MenuItemCardProps) => (
  <Card style={styles.card} testID="menu-item-card">
    <Text category="h6">{item.name}</Text>
    {item.description ? (
      <Text appearance="hint" style={styles.description}>
        {item.description}
      </Text>
    ) : null}
    <View style={styles.footer}>
      {/* basePrice llega como string ("95.50") por NUMERIC + driver pg, aunque el tipo diga number -- mismo caso que menu.service.ts en la API. */}
      <Text category="s1" testID="menu-item-price">
        {currencyFormatter.format(Number(item.basePrice))}
      </Text>
      <Text appearance="hint" testID="menu-item-serves">
        Sirve a {item.servesPeople} {item.servesPeople === 1 ? 'persona' : 'personas'}
      </Text>
    </View>
  </Card>
);

export default MenuItemCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  description: {
    marginTop: 4,
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
