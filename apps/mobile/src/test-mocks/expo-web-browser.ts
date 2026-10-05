/// <reference types="jest" />
// expo-web-browser (pago con Checkout Pro, addendum 01 de ADR-024) usa
// requireNativeModule('ExpoWebBrowser'), que no existe bajo los
// NativeModules mockeados de jest-expo -- mismo caso que expo-blur (ver
// test-mocks/expo-blur.tsx). Los tests que necesitan otro resultado lo
// sobreescriben con mockResolvedValue.
export const openAuthSessionAsync = jest.fn().mockResolvedValue({ type: 'cancel' });
export const openBrowserAsync = jest.fn().mockResolvedValue({ type: 'cancel' });
export const dismissAuthSession = jest.fn();
export const maybeCompleteAuthSession = jest.fn(() => ({ type: 'failed' }));
