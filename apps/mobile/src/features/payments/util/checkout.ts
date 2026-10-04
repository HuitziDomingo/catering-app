import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { PAYMENT_RETURN_RESULTS, type PaymentReturnResult } from '@catering-app/shared-types';

/**
 * Regreso de Checkout Pro tal como llega a la app (addendum 01 de ADR-024):
 * Mercado Pago → GET /payments/return/:result (API) → 302 al deep link
 * mobile://payment/<result>?orderId=…&paymentStatus=…
 *
 * `paymentStatus` es solo una pista: el status real del pedido lo fija el
 * webhook, y la pantalla de regreso siempre lo vuelve a consultar.
 */
export type PaymentReturn = {
  result: PaymentReturnResult;
  orderId: string | null;
  paymentStatus: string | null;
};

/** Prefijo de los deep links de regreso: debe coincidir con MOBILE_PAYMENT_RETURN_URL de la API. */
export const PAYMENT_RETURN_PATH = 'payment';

/**
 * Parsea un deep link de regreso; null si no es uno de los nuestros.
 *
 * Con scheme propio, new URL('mobile://payment/success') deja "payment"
 * como *hostname* y "/success" como pathname; en web
 * ('http://localhost:8081/payment/success') "payment" es parte del pathname.
 * Por eso se busca el segmento "payment" en hostname + pathname y se toma el
 * que sigue, en vez de asumir una de las dos formas. Se usa URL (global
 * WHATWG de Expo) directo -- es lo mismo que hace Linking.parse por dentro,
 * sin su dependencia del manifest de expo-constants.
 */
export function parsePaymentReturnUrl(url: string): PaymentReturn | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const segments = [parsed.hostname, ...parsed.pathname.split('/')].filter(Boolean);
  const index = segments.indexOf(PAYMENT_RETURN_PATH);
  const result = index >= 0 ? segments[index + 1] : undefined;
  if (!result || !PAYMENT_RETURN_RESULTS.includes(result as PaymentReturnResult)) {
    return null;
  }
  const param = (key: string) => parsed.searchParams.get(key) || null;
  return {
    result: result as PaymentReturnResult,
    orderId: param('orderId'),
    paymentStatus: param('paymentStatus'),
  };
}

/**
 * Abre Checkout Pro (init_point).
 *
 * - iOS/Android: sesión de navegador del sistema (ASWebAuthenticationSession
 *   / Custom Tabs) vía expo-web-browser. Se cierra sola cuando Mercado Pago,
 *   vía la API, redirige al deep link mobile://payment/…; ese URL se devuelve
 *   parseado. Si el cliente cierra el navegador a mano, devuelve null.
 * - Web: redirección de página completa (no popup): la API devuelve al
 *   cliente a MOBILE_PAYMENT_RETURN_URL (ej. http://localhost:8081/payment),
 *   que Expo Router resuelve como cualquier ruta. Devuelve null porque la
 *   página se va.
 *
 * Sobre el "bug de hidratación de React al redirigir a Checkout Pro"
 * (investigado en feat/order-flow, 2026-10-04): no puede originarse en esta
 * app. El build web de Expo es una SPA (web.output "single": un index.html
 * con <div id="root"> vacío, render con createRoot), así que no hay HTML de
 * servidor que hidratar. La página de Checkout Pro sí es React con SSR: un
 * error de hidratación en consola durante el pago es de esa página -- típico
 * cuando una extensión del navegador modifica el DOM antes de hidratar (en la
 * consola aparece vía el hook de React DevTools, installHook.js). No rompe el
 * pago y no se reproduce en ventana privada (sin extensiones). Abrir el
 * checkout en otra pestaña/redirección completa (y no en un iframe o WebView
 * propio) mantiene ese error fuera de nuestro árbol de React.
 */
export async function openCheckout(checkoutUrl: string): Promise<PaymentReturn | null> {
  if (Platform.OS === 'web') {
    window.location.assign(checkoutUrl);
    return null;
  }

  const returnUrl = Linking.createURL(PAYMENT_RETURN_PATH);
  const session = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
  if (session.type !== 'success') {
    return null;
  }
  return parsePaymentReturnUrl(session.url);
}

/** Ruta de Expo Router de la pantalla de regreso para un PaymentReturn. */
export function paymentReturnHref(payment: PaymentReturn): string {
  const query = new URLSearchParams();
  if (payment.orderId) query.set('orderId', payment.orderId);
  if (payment.paymentStatus) query.set('paymentStatus', payment.paymentStatus);
  const qs = query.toString();
  return `/${PAYMENT_RETURN_PATH}/${payment.result}${qs ? `?${qs}` : ''}`;
}
