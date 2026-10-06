import React from 'react';
import { Pressable } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { DishImage } from './DishImage';

describe('DishImage', () => {
  it('con imagen: la carga con caché en disco y fundido, y muestra el placeholder mientras carga', () => {
    renderWithProviders(
      <DishImage
        uri="http://storage.test/a.webp"
        accessibilityLabel="Chilaquiles"
      />,
    );

    const img = screen.getByTestId('dish-image-img');
    expect(img.props.source).toEqual({ uri: 'http://storage.test/a.webp' });
    expect(img.props.cachePolicy).toBe('memory-disk');
    expect(img.props.transition).toBeGreaterThan(0);
    expect(screen.getByTestId('dish-image-placeholder')).toBeTruthy();

    fireEvent(img, 'load');

    expect(screen.queryByTestId('dish-image-placeholder')).toBeNull();
    expect(screen.getByLabelText('Chilaquiles')).toBeTruthy();
  });

  it.each([null, undefined, ''])(
    'sin imagen (%p): solo el placeholder, sin intentar cargar',
    (uri) => {
      renderWithProviders(<DishImage uri={uri} />);

      expect(screen.queryByTestId('dish-image-img')).toBeNull();
      expect(screen.getByTestId('dish-image-placeholder')).toBeTruthy();
    },
  );

  it('con error de carga: cae al placeholder y no deja la imagen rota', () => {
    renderWithProviders(<DishImage uri="http://storage.test/borrada.webp" />);

    fireEvent(screen.getByTestId('dish-image-img'), 'error');

    expect(screen.queryByTestId('dish-image-img')).toBeNull();
    expect(screen.getByTestId('dish-image-placeholder')).toBeTruthy();
  });

  it('vuelve a intentar si después del error llega otra URL', () => {
    // rerender() reemplazaría también los providers: se cambia la URL desde
    // dentro del árbol, como pasa en la app cuando el staff reemplaza la imagen.
    const Harness = () => {
      const [uri, setUri] = React.useState('http://storage.test/borrada.webp');
      return (
        <>
          <DishImage uri={uri} />
          <Pressable
            testID="swap"
            onPress={() => setUri('http://storage.test/nueva.webp')}
          />
        </>
      );
    };
    renderWithProviders(<Harness />);
    fireEvent(screen.getByTestId('dish-image-img'), 'error');
    expect(screen.queryByTestId('dish-image-img')).toBeNull();

    fireEvent.press(screen.getByTestId('swap'));

    expect(screen.getByTestId('dish-image-img').props.source).toEqual({
      uri: 'http://storage.test/nueva.webp',
    });
  });
});
