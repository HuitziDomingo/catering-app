import React, { useState } from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, Button, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { MotiView } from 'moti';

// Prueba de humo del esqueleto móvil: confirma que Expo arranca, UI Kitten
// renderiza, y Moti anima. Aún sin pantallas reales (ADR-011).
export const App = () => {
  const [clicks, setClicks] = useState(0);

  return (
    <>
      <IconRegistry icons={EvaIconsPack} />
      <ApplicationProvider {...eva} theme={eva.light}>
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

            <MotiView
              from={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'timing', duration: 300 }}
            >
              <Button onPress={() => setClicks((c) => c + 1)}>
                Probar UI Kitten + Moti
              </Button>
            </MotiView>

            <Text testID="click-count">Clicks: {clicks}</Text>
          </View>
        </SafeAreaView>
      </ApplicationProvider>
    </>
  );
};

export default App;
