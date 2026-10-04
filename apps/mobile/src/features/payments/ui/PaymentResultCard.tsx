import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Spinner, Text } from '@ui-kitten/components';
import { OrderStatus, type PaymentReturnResult } from '@catering-app/shared-types';

type PaymentResultCardProps = {
  /** Con qué ruta regresó Mercado Pago (solo navegación, no la verdad). */
  result: PaymentReturnResult;
  /** Status real del pedido re-consultado a la API; null mientras carga. */
  orderStatus: OrderStatus | null;
  /** true mientras se espera que el webhook confirme. */
  waiting: boolean;
};

type View = { status: 'success' | 'danger' | 'warning' | 'info'; title: string; body: string };

/**
 * Qué mostrar. Manda el status real del pedido (lo fija el webhook,
 * ADR-024); el `result` de la URL solo decide qué decir mientras el webhook
 * no ha llegado.
 */
export function describePaymentResult(
  result: PaymentReturnResult,
  orderStatus: OrderStatus | null
): View {
  if (orderStatus === OrderStatus.CONFIRMED || orderStatus === OrderStatus.PREPARING || orderStatus === OrderStatus.DELIVERED) {
    return { status: 'success', title: '¡Pago aprobado!', body: 'Tu pedido está confirmado.' };
  }
  if (orderStatus === OrderStatus.PAYMENT_FAILED || result === 'failure') {
    return {
      status: 'danger',
      title: 'El pago no se completó',
      body: 'No se hizo ningún cargo. Puedes intentarlo de nuevo con otro método.',
    };
  }
  if (orderStatus === OrderStatus.CANCELLED) {
    return {
      status: 'warning',
      title: 'Este pedido fue cancelado',
      body: 'Si se registró un cargo, el negocio se pondrá en contacto contigo.',
    };
  }
  if (result === 'success') {
    return {
      status: 'info',
      title: 'Estamos confirmando tu pago',
      body: 'Mercado Pago aprobó el pago; en unos segundos tu pedido aparecerá como confirmado.',
    };
  }
  return {
    status: 'warning',
    title: 'Pago pendiente',
    body: 'Tu pago está en proceso (por ejemplo, en efectivo o transferencia). Te avisaremos cuando se acredite.',
  };
}

// Tarjeta de la pantalla de regreso del pago (ADR-020, ui/ pura).
export const PaymentResultCard = ({ result, orderStatus, waiting }: PaymentResultCardProps) => {
  const view = describePaymentResult(result, orderStatus);
  return (
    <Card status={view.status} disabled testID={`payment-result-${view.status}`}>
      <Text category="h6" style={styles.title}>
        {view.title}
      </Text>
      <Text category="p2">{view.body}</Text>
      {waiting ? <Spinner size="small" style={styles.spinner} /> : null}
    </Card>
  );
};

export default PaymentResultCard;

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  spinner: { marginTop: 12 },
});
