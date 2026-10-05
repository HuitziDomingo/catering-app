import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { openCheckout, parsePaymentReturnUrl, paymentReturnHref } from './checkout';

// expo-web-browser llega mockeado vía moduleNameMapper (test-mocks/expo-web-browser.ts).
// createURL depende de la config de la app (scheme): se fija al de app.json.
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `mobile://${path}`,
}));

const orderId = 'aeaa31e3-7a3b-4971-8420-a644c2137eca';

describe('parsePaymentReturnUrl', () => {
  it('lee result, orderId y paymentStatus del deep link de regreso', () => {
    expect(
      parsePaymentReturnUrl(`mobile://payment/success?orderId=${orderId}&paymentStatus=approved`)
    ).toEqual({ result: 'success', orderId, paymentStatus: 'approved' });
  });

  it('también entiende la URL web de regreso (Expo web, MOBILE_PAYMENT_RETURN_URL http)', () => {
    expect(
      parsePaymentReturnUrl(`http://localhost:8081/payment/failure?orderId=${orderId}`)
    ).toEqual({ result: 'failure', orderId, paymentStatus: null });
  });

  it('acepta failure/pending y deja null los parámetros ausentes', () => {
    expect(parsePaymentReturnUrl('mobile://payment/pending')).toEqual({
      result: 'pending',
      orderId: null,
      paymentStatus: null,
    });
  });

  it('devuelve null para links que no son de regreso de pago o con result desconocido', () => {
    expect(parsePaymentReturnUrl('mobile://menu/abc')).toBeNull();
    expect(parsePaymentReturnUrl('mobile://payment/hacked?orderId=x')).toBeNull();
    expect(parsePaymentReturnUrl('no es un url')).toBeNull();
  });
});

describe('paymentReturnHref', () => {
  it('arma la ruta de Expo Router con los parámetros codificados', () => {
    expect(paymentReturnHref({ result: 'failure', orderId: 'a&b', paymentStatus: null })).toBe(
      '/payment/failure?orderId=a%26b'
    );
    expect(paymentReturnHref({ result: 'pending', orderId: null, paymentStatus: null })).toBe(
      '/payment/pending'
    );
  });
});

describe('openCheckout (nativo)', () => {
  const originalOS = Platform.OS;
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
  });
  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
  });
  beforeEach(() => jest.clearAllMocks());

  it('abre una sesión de navegador que termina en el deep link de regreso y lo parsea', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: `mobile://payment/success?orderId=${orderId}&paymentStatus=approved`,
    });

    await expect(openCheckout('https://mp/checkout')).resolves.toEqual({
      result: 'success',
      orderId,
      paymentStatus: 'approved',
    });
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://mp/checkout',
      'mobile://payment'
    );
  });

  it('devuelve null si el cliente cierra el navegador sin terminar', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });

    await expect(openCheckout('https://mp/checkout')).resolves.toBeNull();
  });
});
