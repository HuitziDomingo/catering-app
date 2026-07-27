import React from 'react';
import { BottomNavigation, BottomNavigationTab, Icon } from '@ui-kitten/components';

export type TabBarItem = {
  title: string;
  icon: string;
};

type TabBarProps = {
  items: TabBarItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

// Componente de presentación pura (sin lógica de navegación), vive en ui/
// según ADR-020. El layout de rutas (app/(tabs)/_layout.tsx) traduce el
// estado de React Navigation a estas props simples.
export const TabBar = ({ items, selectedIndex, onSelect }: TabBarProps) => (
  <BottomNavigation testID="app-tab-bar" selectedIndex={selectedIndex} onSelect={onSelect}>
    {items.map((item) => (
      <BottomNavigationTab
        key={item.title}
        title={item.title}
        icon={(props) => <Icon {...props} name={item.icon} />}
      />
    ))}
  </BottomNavigation>
);

export default TabBar;
