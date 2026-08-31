import React from 'react';
import { View, type ViewProps } from 'react-native';

// Mock para tests (ver moduleNameMapper en jest.config.cts): a diferencia de
// react-native-reanimated/AsyncStorage, expo-blur no publica su propio mock
// de Jest, y BlurView usa requireNativeViewManager, que no está disponible
// bajo los NativeModules simulados de jest-expo. Un View simple alcanza --
// los tests solo verifican contenido/testIDs renderizados, nunca el efecto
// de blur en sí (eso se verifica visualmente en el simulador de iOS, ver
// ADR-025).
type BlurViewProps = ViewProps & { tint?: string; intensity?: number };

export const BlurView = ({ tint: _tint, intensity: _intensity, ...props }: BlurViewProps) => (
  <View {...props} />
);

export default BlurView;
