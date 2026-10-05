import { PaymentResultScreen } from '../../features/payments/feature/PaymentResultScreen';

// Ruta del deep link de regreso de Checkout Pro: mobile://payment/<result>
// (addendum 01 de ADR-024). Vive fuera de (tabs) para coincidir con el path
// que arma la API (MOBILE_PAYMENT_RETURN_URL + /<result>). Ruta delgada
// (ADR-017, ADR-020).
export const PaymentResultRoute = PaymentResultScreen;

export default PaymentResultRoute;
