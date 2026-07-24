import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Spinner, Text } from '@ui-kitten/components';
import { useShallow } from 'zustand/react/shallow';
import { selectVisibleItems, useMenuStore } from '../state/useMenuStore';
import { CategoryFilter } from '../ui/CategoryFilter';
import { MenuItemList } from '../ui/MenuItemList';

// Pantalla del feature de menú (ver ADR-020): conecta data-access (via el
// store) + estado (Zustand) + componentes de presentación de ui/. Primera
// pantalla real del menú -- reemplaza la prueba de humo de UI Kitten + Moti.
export const MenuScreen = () => {
  const categories = useMenuStore((state) => state.categories);
  const selectedCategoryId = useMenuStore((state) => state.selectedCategoryId);
  const status = useMenuStore((state) => state.status);
  const error = useMenuStore((state) => state.error);
  const load = useMenuStore((state) => state.load);
  const selectCategory = useMenuStore((state) => state.selectCategory);
  const visibleItems = useMenuStore(useShallow(selectVisibleItems));

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <Text category="h5" style={styles.title}>
          Menú
        </Text>

        {status === 'loading' && (
          <View style={styles.centered} testID="menu-loading">
            <Spinner size="large" />
          </View>
        )}

        {status === 'error' && (
          <View style={styles.centered} testID="menu-error">
            <Text status="danger" style={styles.errorText}>
              {error ?? 'No se pudo cargar el menú.'}
            </Text>
            <Button appearance="outline" status="danger" onPress={load}>
              Reintentar
            </Button>
          </View>
        )}

        {status === 'success' && (
          <>
            <CategoryFilter
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={selectCategory}
            />
            <MenuItemList items={visibleItems} />
          </>
        )}
      </SafeAreaView>
    </>
  );
};

export default MenuScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    textAlign: 'center',
  },
});
