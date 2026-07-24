import React, { useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuSmokeButton } from '../ui/MenuSmokeButton';

// Piloto de arquitectura feature-first (ADR-020): prueba de humo de Expo +
// UI Kitten + Moti reorganizada bajo features/menu/, sin lógica de negocio
// de menú real todavía (eso es una tarea futura separada).
export const MenuSmoke = () => {
  const [clicks, setClicks] = useState(0);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            gap: 16,
          }}
        >
          <Text testID="heading" role="heading" style={{ fontSize: 20 }}>
            Catering — App móvil
          </Text>
          <Text style={{ textAlign: 'center', color: '#555' }}>
            Esqueleto Expo + UI Kitten + Moti (ADR-011). Sin pantallas
            todavía: esto solo prueba que arranca y renderiza componentes.
          </Text>

          <MenuSmokeButton
            label="Probar UI Kitten + Moti"
            onPress={() => setClicks((c) => c + 1)}
          />

          <Text testID="click-count">Clicks: {clicks}</Text>
        </View>
      </SafeAreaView>
    </>
  );
};

export default MenuSmoke;
