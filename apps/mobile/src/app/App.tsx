// NativeWind: hoja de estilos Tailwind procesada por Metro (ADR-003).
import '../../globals.css';

import React, { useState } from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { GluestackUIProvider } from '../../components/ui/gluestack-ui-provider';
import { Button, ButtonText } from '../../components/ui/button';

// Prueba de humo del esqueleto móvil: solo confirma que Expo arranca y que un
// componente de gluestack-ui (Button) renderiza. Aún sin pantallas reales.
export const App = () => {
  const [clicks, setClicks] = useState(0);

  return (
    <GluestackUIProvider mode="light">
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
            Esqueleto Expo + gluestack-ui (ADR-003 / ADR-008). Sin pantallas
            todavía: esto solo prueba que arranca y renderiza un componente.
          </Text>

          <Button
            size="md"
            action="primary"
            onPress={() => setClicks((c) => c + 1)}
          >
            <ButtonText>Probar gluestack</ButtonText>
          </Button>

          <Text testID="click-count">Clicks: {clicks}</Text>
        </View>
      </SafeAreaView>
    </GluestackUIProvider>
  );
};

export default App;
