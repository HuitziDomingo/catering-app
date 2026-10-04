import * as React from 'react';
import { renderWithProviders } from '../../../test-utils';
import { TabBar } from './TabBar';

jest.setTimeout(30000);

test('muestra el badge solo en los tabs con contador > 0, con tope 99+', () => {
  const utils = renderWithProviders(
    <TabBar
      items={[
        { title: 'Menú', icon: 'grid-outline' },
        { title: 'Carrito', icon: 'shopping-cart-outline', badge: 3 },
        { title: 'Chat', icon: 'message-circle-outline', badge: 0 },
      ]}
      selectedIndex={0}
      onSelect={jest.fn()}
    />
  );

  expect(utils.getByTestId('tab-badge-Carrito')).toHaveTextContent('3');
  expect(utils.queryByTestId('tab-badge-Chat')).toBeNull();
  expect(utils.queryByTestId('tab-badge-Menú')).toBeNull();

  // Render separado: rerender() reemplaza la raíz sin el wrapper de AppProviders.
  const capped = renderWithProviders(
    <TabBar
      items={[{ title: 'Carrito', icon: 'shopping-cart-outline', badge: 150 }]}
      selectedIndex={0}
      onSelect={jest.fn()}
    />
  );
  expect(capped.getByTestId('tab-badge-Carrito')).toHaveTextContent('99+');
});
