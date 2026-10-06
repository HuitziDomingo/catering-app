import React from 'react';
import { View, type ViewProps } from 'react-native';

// Mock para tests (ver moduleNameMapper en jest.config.cts): expo-image es
// módulo nativo (ExpoImage) y no publica mock de Jest, igual que expo-blur.
// Un View que conserva las props permite a los tests leer `source`,
// `cachePolicy` o `transition` y disparar onLoad/onError con fireEvent.
type ImageProps = ViewProps & {
  source?: unknown;
  cachePolicy?: string;
  transition?: unknown;
  contentFit?: string;
  recyclingKey?: string | null;
  onLoad?: () => void;
  onError?: () => void;
};

export const Image = (props: ImageProps) => <View {...props} />;

export default { Image };
