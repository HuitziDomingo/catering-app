import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { prepareReceiptViewer } from './receiptViewer';

// expo-web-browser llega mockeado vía moduleNameMapper (test-mocks/expo-web-browser.ts).

const originalOS = Platform.OS;

afterEach(() => {
  Platform.OS = originalOS;
  jest.clearAllMocks();
});

test('en iOS/Android abre el PDF con el navegador del sistema', async () => {
  Platform.OS = 'ios';

  await prepareReceiptViewer().show('http://storage/r.pdf');

  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('http://storage/r.pdf');
});

describe('web', () => {
  let tab: { opener: unknown; location: { href: string }; close: jest.Mock };
  let openSpy: jest.Mock;
  const originalOpen = window.open;

  beforeEach(() => {
    Platform.OS = 'web';
    tab = { opener: {}, location: { href: '' }, close: jest.fn() };
    // El entorno de jest-expo es el nativo: window.open no existe.
    openSpy = jest.fn().mockReturnValue(tab);
    window.open = openSpy;
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  test('abre la pestaña al preparar (mismo toque) y le pone la URL después, sin opener', async () => {
    const viewer = prepareReceiptViewer();
    expect(openSpy).toHaveBeenCalledWith('', '_blank');

    await viewer.show('http://storage/r.pdf');

    expect(tab.location.href).toBe('http://storage/r.pdf');
    expect(tab.opener).toBeNull();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  test('cancel cierra la pestaña vacía si la API falló', () => {
    prepareReceiptViewer().cancel();

    expect(tab.close).toHaveBeenCalled();
  });
});
