import React from 'react';
import { Button } from '@ui-kitten/components';
import { MotiView } from 'moti';

type MenuSmokeButtonProps = {
  label: string;
  onPress: () => void;
};

// Botón de presentación pura (sin estado ni lógica de negocio), reutilizable
// entre features — vive en ui/ según la separación de ADR-020.
export const MenuSmokeButton = ({ label, onPress }: MenuSmokeButtonProps) => (
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
    <Button onPress={onPress}>{label}</Button>
  </MotiView>
);

export default MenuSmokeButton;
