import React from 'react';
import { View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useTheme } from '@ui-kitten/components';
import { TabBar, type TabBarItem } from '../../features/navigation/ui/TabBar';

// Metadata de cada tab (título mostrado + icono Eva), indexada por el nombre
// de ruta (carpeta/archivo bajo app/(tabs)/) tal como lo expone React
// Navigation en `state.routeNames`.
const TAB_META: Record<string, TabBarItem> = {
  menu: { title: 'Menú', icon: 'grid-outline' },
  chat: { title: 'Chat', icon: 'message-circle-outline' },
  perfil: { title: 'Perfil', icon: 'person-outline' },
};

// Tab bar personalizado (UI Kitten BottomNavigation) conectado al layout
// Tabs de expo-router, siguiendo el patrón documentado por UI Kitten para
// integrarse con React Navigation (selectedIndex={state.index}, onSelect
// navega por nombre de ruta). El componente de presentación vive en
// features/navigation/ui (ADR-020); este layout solo lo conecta al estado
// de React Navigation.
//
// NavigationTabBar se monta vía JSX (abajo, en renderTabBar) -- por eso es
// seguro usar hooks (useTheme) aquí dentro. React Navigation invoca la prop
// `tabBar` como una llamada de función plana, no como JSX, así que un hook
// llamado directamente en esa función rompe las reglas de hooks (no hay
// fiber propio para esa invocación); delegar a un componente real evita el
// problema.
const NavigationTabBar = ({ state, navigation, insets }: BottomTabBarProps) => {
  const theme = useTheme();

  return (
    <View style={{ paddingBottom: insets.bottom, backgroundColor: theme['background-basic-color-1'] }}>
      <TabBar
        items={state.routeNames.map(
          (name) => TAB_META[name] ?? { title: name, icon: 'grid-outline' }
        )}
        selectedIndex={state.index}
        onSelect={(index) => navigation.navigate(state.routeNames[index])}
      />
    </View>
  );
};

const renderTabBar = (props: BottomTabBarProps) => <NavigationTabBar {...props} />;

export const TabsLayout = () => (
  <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="menu" options={{ title: TAB_META.menu.title }} />
    <Tabs.Screen name="chat" options={{ title: TAB_META.chat.title }} />
    <Tabs.Screen name="perfil" options={{ title: TAB_META.perfil.title }} />
  </Tabs>
);

export default TabsLayout;
