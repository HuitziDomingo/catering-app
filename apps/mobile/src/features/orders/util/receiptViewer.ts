import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/** Dónde se muestra el recibo PDF, preparado antes de pedir su URL a la API. */
export type ReceiptViewer = {
  show: (url: string) => Promise<void>;
  /** La API falló: deshace lo que se haya preparado. */
  cancel: () => void;
};

/**
 * - iOS/Android: navegador del sistema dentro de la app (SFSafariViewController
 *   / Custom Tabs) con expo-web-browser, que ya está en el Dev Client por el
 *   pago (addendum 01 de ADR-024): no agrega módulos nativos. Abre la URL
 *   firmada sin header Authorization, que es justo para lo que existe
 *   (ADR-028).
 * - Web: otra pestaña. Se abre vacía en el mismo toque, antes de esperar a la
 *   API, porque el bloqueador de ventanas emergentes frena un window.open que
 *   llega después de un await.
 */
export function prepareReceiptViewer(): ReceiptViewer {
  if (Platform.OS === 'web') {
    const tab = window.open('', '_blank');
    return {
      show: async (url) => {
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener');
        }
      },
      cancel: () => tab?.close(),
    };
  }
  return {
    show: async (url) => {
      await WebBrowser.openBrowserAsync(url);
    },
    cancel: () => undefined,
  };
}
