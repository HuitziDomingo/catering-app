import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@ui-kitten/components';
import type { MenuItem } from '@catering-app/shared-types';
import { DishImage } from '../../../core/ui/DishImage';
import { formatServesRange } from '../util/formatServesRange';

type MenuItemDetailProps = {
  item: MenuItem;
  categoryName: string | null;
};

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. Recibe el MenuItem y el nombre de categoría ya resueltos -- no
// llama a data-access ni al store directamente.
export const MenuItemDetail = ({ item, categoryName }: MenuItemDetailProps) => {
  const theme = useTheme();

  return (
    <ScrollView
      testID="menu-item-detail"
      contentContainerStyle={styles.content}
      style={{ backgroundColor: theme['background-basic-color-2'] }}
    >
      <DishImage
        uri={item.imageUrl}
        style={styles.image}
        iconSize={56}
        accessibilityLabel={item.name}
        testID="menu-item-detail-image"
      />

      <View style={styles.body}>
        {categoryName ? (
          <Text appearance="hint" category="c1" testID="menu-item-detail-category">
            {categoryName}
          </Text>
        ) : null}
        <Text category="h4" style={styles.name}>
          {item.name}
        </Text>

        <View style={styles.row}>
          <Text category="h5" status="primary" testID="menu-item-detail-price">
            {currencyFormatter.format(Number(item.basePrice))}
          </Text>
          <Text appearance="hint" category="s1" testID="menu-item-detail-serves">
            {formatServesRange(item.servesMin, item.servesMax)}
          </Text>
        </View>

        {item.description ? (
          <Text category="p1" style={styles.description} testID="menu-item-detail-description">
            {item.description}
          </Text>
        ) : (
          <Text appearance="hint" category="p1" style={styles.description}>
            Este platillo no tiene descripción.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default MenuItemDetail;

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  image: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
    gap: 4,
  },
  name: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  description: {
    lineHeight: 22,
  },
});
