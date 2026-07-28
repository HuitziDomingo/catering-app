import { OrderStatus } from '@catering-app/shared-types';
import type { ConsultarPedidosPorClienteResult } from '../data-access/mcpClient';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pendiente',
  [OrderStatus.CONFIRMED]: 'Confirmado',
  [OrderStatus.PREPARING]: 'En preparación',
  [OrderStatus.DELIVERED]: 'Entregado',
  [OrderStatus.CANCELLED]: 'Cancelado',
};

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});
const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

/** Formatea el resultado del tool MCP consultar_pedidos_por_cliente como texto para la burbuja del asistente. */
export function formatOrdersReply(result: ConsultarPedidosPorClienteResult): string {
  if (result.count === 0) {
    return 'No encontré pedidos registrados a tu nombre.';
  }

  const lines = result.data.map((order, index) => {
    const date = dateFormatter.format(new Date(order.scheduledFor));
    const status = STATUS_LABELS[order.status] ?? order.status;
    return `${index + 1}. ${status} · ${date} · ${order.peopleCount} personas · ${currencyFormatter.format(order.total)}`;
  });

  return `Aquí están tus pedidos recientes:\n\n${lines.join('\n')}`;
}
