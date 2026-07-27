import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from '@ui-kitten/components';
import type { MenuItem } from '@catering-app/shared-types';

type MenuItemCardProps = {
  item: MenuItem;
  onPress?: (item: MenuItem) => void;
};

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. Recibe un MenuItem ya resuelto -- no llama a data-access ni al
// store directamente.
export const MenuItemCard = ({ item, onPress }: MenuItemCardProps) => {
  const theme = useTheme();
  // menu_items.image_url es opcional (ADR-006) y puede fallar en runtime
  // (URL rota, sin conexión) -- en ambos casos se cae al placeholder.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imageFailed;

  return (
    <Pressable
      testID="menu-item-card"
      onPress={() => onPress?.(item)}
      style={[styles.card, { backgroundColor: theme['background-basic-color-1'] }]}
    >
      {showImage ? (
        <Image
          testID="menu-item-image"
          source={{ uri: item.imageUrl as string }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View
          testID="menu-item-image-placeholder"
          style={[styles.image, { backgroundColor: theme['background-basic-color-3'] }]}
        >
          <Icon
            name="image-outline"
            fill={theme['text-hint-color']}
            style={styles.placeholderIcon}
          />
        </View>
      )}

      <View style={styles.body}>
        <Text category="h6" numberOfLines={2}>
          {item.name}
        </Text>
        {item.description ? (
          <Text appearance="hint" category="p2" numberOfLines={3} style={styles.description}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.footer}>
          {/* basePrice llega como string ("95.50") por NUMERIC + driver pg, aunque el tipo diga number -- mismo caso que menu.service.ts en la API. */}
          <Text category="s1" status="primary" style={styles.price} testID="menu-item-price">
            {currencyFormatter.format(Number(item.basePrice))}
          </Text>
          <Text appearance="hint" category="c1" testID="menu-item-serves">
            Sirve a {item.servesPeople} {item.servesPeople === 1 ? 'persona' : 'personas'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export default MenuItemCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 36,
    height: 36,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  price: {
    fontWeight: '700',
  },
});
