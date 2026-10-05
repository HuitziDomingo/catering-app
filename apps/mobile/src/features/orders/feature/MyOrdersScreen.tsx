import React, { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Spinner, Text, useTheme } from '@ui-kitten/components';
import { useFocusEffect, useRouter } from 'expo-router';
import type { OrderDetail } from '@catering-app/shared-types';
import { useSessionStore } from '../../auth/state/useSessionStore';
import { LoginScreen } from '../../auth/feature/LoginScreen';
import { useOrdersStore } from '../state/useOrdersStore';
import { OrderListItem } from '../ui/OrderListItem';

// "Mis pedidos" (ADR-020, ADR-027): GET /orders/mine paginado. Se recarga
// cada vez que el tab toma foco (ej. al volver de pagar) y al cambiar de
// usuario. Sin sesión, login embebido.
export const MyOrdersScreen = () => {
  const isBootstrapping = useSessionStore((state) => state.isBootstrapping);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const userId = useSessionStore((state) => state.user?.id ?? null);
  const items = useOrdersStore((state) => state.items);
  const total = useOrdersStore((state) => state.total);
  const listStatus = useOrdersStore((state) => state.listStatus);
  const listError = useOrdersStore((state) => state.listError);
  const loadingMore = useOrdersStore((state) => state.loadingMore);
  const load = useOrdersStore((state) => state.load);
  const loadMore = useOrdersStore((state) => state.loadMore);
  const clear = useOrdersStore((state) => state.clear);
  const theme = useTheme();
  const router = useRouter();

  // Los pedidos de otro usuario nunca deben verse tras un cambio de sesión.
  useEffect(() => {
    clear();
  }, [userId, clear]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        load();
      }
    }, [isAuthenticated, load])
  );

  if (isBootstrapping) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme['background-basic-color-2'] }]}>
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoggedIn={() => undefined} />;
  }

  const openOrder = (order: OrderDetail) => router.push(`/pedidos/${order.id}`);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <Text category="h5" style={styles.title}>
        Mis pedidos
      </Text>

      {listStatus === 'error' && items.length === 0 ? (
        <View style={styles.centered} testID="my-orders-error">
          <Text status="danger" style={styles.message}>
            {listError ?? 'No se pudieron cargar tus pedidos.'}
          </Text>
          <Button appearance="outline" status="danger" onPress={load}>
            Reintentar
          </Button>
        </View>
      ) : listStatus === 'loading' && items.length === 0 ? (
        <View style={styles.centered} testID="my-orders-loading">
          <Spinner size="large" />
        </View>
      ) : listStatus === 'success' && items.length === 0 ? (
        <View style={styles.centered} testID="my-orders-empty">
          <Text appearance="hint" style={styles.message}>
            Todavía no tienes pedidos.
          </Text>
          <Button appearance="outline" onPress={() => router.navigate('/menu')}>
            Ver menú
          </Button>
        </View>
      ) : (
        <FlatList
          testID="my-orders-list"
          data={items}
          keyExtractor={(order) => order.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <OrderListItem order={item} onPress={openOrder} />}
          refreshControl={
            <RefreshControl refreshing={listStatus === 'loading'} onRefresh={load} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <Spinner size="small" />
            ) : items.length < total ? null : (
              <Text appearance="hint" category="c1" style={styles.footer}>
                {`${total} ${total === 1 ? 'pedido' : 'pedidos'}`}
              </Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

export default MyOrdersScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  list: { padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { marginBottom: 16, textAlign: 'center' },
  footer: { textAlign: 'center', marginTop: 8 },
});
