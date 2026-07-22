import React, { useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@ui-kitten/components';
import { MotiView } from 'moti';

// Prueba de humo del esqueleto móvil: confirma que Expo arranca, UI Kitten
// renderiza, y Moti anima. Aún sin pantallas reales (ADR-011).
export const Index = () => {
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

          <MotiView
            from={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            // @ts-expect-error moti 0.30.0's transition prop type resolves to
            // MotiTransitionProp<any> regardless of the Animate generic, so a
            // valid { type, duration } config is never assignable. Confirmed
            // this isn't fixable via as const or explicit generics — it's a
            // bug in moti's shipped types, not this code.
            transition={{ type: 'timing', duration: 300 }}
          >
            <Button onPress={() => setClicks((c) => c + 1)}>
              Probar UI Kitten + Moti
            </Button>
          </MotiView>

          <Text testID="click-count">Clicks: {clicks}</Text>
        </View>
      </SafeAreaView>
    </>
  );
};

export default Index;
