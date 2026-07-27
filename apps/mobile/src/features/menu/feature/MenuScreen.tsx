import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Spinner, Text, useTheme } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import type { MenuItem } from '@catering-app/shared-types';
import { selectVisibleItems, useMenuStore } from '../state/useMenuStore';
import { CategoryFilter } from '../ui/CategoryFilter';
import { MenuItemList } from '../ui/MenuItemList';
import { ThemeToggle } from '../../theme/ui/ThemeToggle';
import { useResolvedColorScheme } from '../../theme/state/useThemeStore';

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
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const router = useRouter();

  useEffect(() => {
    load();
  }, [load]);

  const goToItemDetail = (item: MenuItem) => {
    router.push(`/menu/${item.id}`);
  };

  return (
    <>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
      >
        <View style={styles.header}>
          <Text category="h5">Menú</Text>
          <ThemeToggle />
        </View>

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
            <MenuItemList items={visibleItems} onItemPress={goToItemDetail} />
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
  header: {
    flexDirection: 'row',
    // flex-start (not space-between) keeps ThemeToggle away from the
    // top-right corner, where Expo Dev Client's floating dev-menu button
    // has an invisible hit region that swallows taps before they reach RN.
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
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
