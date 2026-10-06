import { useCallback, useState } from 'react';
import { extractErrorMessage } from '../../../core/http/extractErrorMessage';
import { fetchOrderReceipt } from '../data-access/ordersDataAccess';
import { prepareReceiptViewer } from '../util/receiptViewer';

/**
 * "Ver recibo" en el detalle del pedido (ADR-028): pide la URL firmada y
 * abre el PDF. Estado local: el recibo no se guarda en ningún store, la URL
 * caduca en 15 minutos y se pide de nuevo en cada toque.
 */
export function useOrderReceipt() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openReceipt = useCallback(async (orderId: string) => {
    const viewer = prepareReceiptViewer();
    setBusy(true);
    setError(null);
    try {
      const { url } = await fetchOrderReceipt(orderId);
      await viewer.show(url);
    } catch (err) {
      viewer.cancel();
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  return { openReceipt, busy, error };
}
