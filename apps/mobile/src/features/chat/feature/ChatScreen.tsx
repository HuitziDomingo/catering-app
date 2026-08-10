import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spinner, useTheme } from '@ui-kitten/components';
import { useSessionStore } from '../../auth/state/useSessionStore';
import { LoginScreen } from '../../auth/feature/LoginScreen';
import { useMenuStore } from '../../menu/state/useMenuStore';
import { useChatStore } from '../state/useChatStore';
import type { PendingOrderDraft } from '../state/useChatStore';
import { consultarPedidosPorCliente, crearPedido } from '../data-access/mcpClient';
import { formatOrdersReply } from '../util/formatOrdersReply';
import { looksOrderRelated } from '../util/looksOrderRelated';
import { looksLikeCreateOrderIntent } from '../util/looksLikeCreateOrderIntent';
import {
  extractOrderIntent,
  type OrderIntentExtractionFailureReason,
} from '../util/extractOrderIntent';
import { ChatMessageList } from '../ui/ChatMessageList';
import { ChatComposer } from '../ui/ChatComposer';
import { ConfirmOrderCard } from '../ui/ConfirmOrderCard';

const FALLBACK_REPLY =
  'Puedo ayudarte a consultar tus pedidos, prueba preguntando algo como ' +
  '"¿cuáles son mis pedidos?"';

const CLARIFICATION_BY_REASON: Record<OrderIntentExtractionFailureReason, string> = {
  'no-menu-item-match':
    'No reconocí ese platillo en el menú. ¿Puedes decirme el nombre exacto tal como aparece en el menú?',
  'ambiguous-menu-item':
    'Encontré más de un platillo que coincide con tu mensaje. ¿Puedes ser más específico con el nombre?',
  'no-people-count':
    '¿Para cuántas personas es el pedido? Indícame la cantidad, por ejemplo "400 personas".',
  'no-date':
    '¿Para qué fecha necesitas el pedido? Puedes decir algo como "en 4 días" o "mañana".',
  'date-not-future':
    'Esa fecha ya pasó. ¿Para qué fecha futura necesitas el pedido?',
};

// Pantalla del feature de chat (ver ADR-020, ADR-002, ADR-023). v1 funcional
// y pattern-based (sin LLM real todavía): detecta si el mensaje suena a
// creación de pedido (looksLikeCreateOrderIntent) y, si es así, intenta
// extraer platillo/personas/fecha (extractOrderIntent) para mostrar una
// tarjeta de confirmación antes de invocar crear_pedido -- nunca se crea un
// pedido de la primera interpretación. Si no es un mensaje de creación,
// cae al flujo existente de consulta (looksOrderRelated + tool
// consultar_pedidos_por_cliente); si tampoco, responde con un mensaje fijo.
export const ChatScreen = () => {
  const isBootstrapping = useSessionStore((state) => state.isBootstrapping);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const accessToken = useSessionStore((state) => state.accessToken);
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const pendingOrderDraft = useChatStore((state) => state.pendingOrderDraft);
  const addMessage = useChatStore((state) => state.addMessage);
  const setLoading = useChatStore((state) => state.setLoading);
  const setPendingOrderDraft = useChatStore((state) => state.setPendingOrderDraft);
  const menuItems = useMenuStore((state) => state.items);
  const menuStatus = useMenuStore((state) => state.status);
  const loadMenu = useMenuStore((state) => state.load);
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (menuStatus === 'idle') {
      loadMenu();
    }
  }, [menuStatus, loadMenu]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !accessToken) {
      return;
    }
    addMessage({ role: 'user', text });
    setDraft('');

    if (looksLikeCreateOrderIntent(text)) {
      const extraction = extractOrderIntent(text, menuItems);
      if (!extraction.ok) {
        addMessage({ role: 'assistant', text: CLARIFICATION_BY_REASON[extraction.reason] });
        return;
      }

      const orderDraft: PendingOrderDraft = {
        menuItemId: extraction.intent.menuItem.id,
        menuItemName: extraction.intent.menuItem.name,
        peopleCount: extraction.intent.peopleCount,
        scheduledFor: extraction.intent.scheduledFor,
      };
      setPendingOrderDraft(orderDraft);
      addMessage({
        role: 'assistant',
        text: 'Encontré esto en tu mensaje, revisa la tarjeta de abajo para confirmar el pedido.',
      });
      return;
    }

    if (!looksOrderRelated(text)) {
      addMessage({ role: 'assistant', text: FALLBACK_REPLY });
      return;
    }

    setLoading(true);
    try {
      const result = await consultarPedidosPorCliente(accessToken);
      addMessage({ role: 'assistant', text: formatOrdersReply(result) });
    } catch (err) {
      addMessage({
        role: 'assistant',
        text:
          'No pude consultar tus pedidos en este momento. ' +
          (err instanceof Error ? err.message : 'Intenta de nuevo más tarde.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrderDraft = () => {
    setPendingOrderDraft(null);
    addMessage({
      role: 'assistant',
      text: 'Cancelé ese pedido. Dime si quieres intentar de nuevo.',
    });
  };

  const handleConfirmOrderDraft = async () => {
    if (!pendingOrderDraft || !accessToken) {
      return;
    }
    setLoading(true);
    try {
      const result = await crearPedido(accessToken, {
        items: [{ menuItemId: pendingOrderDraft.menuItemId, quantity: 1 }],
        peopleCount: pendingOrderDraft.peopleCount,
        scheduledFor: pendingOrderDraft.scheduledFor,
      });
      const reviewNote = result.data.needsReview
        ? ' Como la cantidad de personas está fuera del rango habitual de ese platillo, tu pedido quedó marcado para revisión de nuestro equipo.'
        : '';
      addMessage({
        role: 'assistant',
        text: `Tu pedido quedó registrado (folio ${result.data.id}).${reviewNote}`,
      });
    } catch (err) {
      addMessage({
        role: 'assistant',
        text:
          'No pude crear tu pedido en este momento. ' +
          (err instanceof Error ? err.message : 'Intenta de nuevo más tarde.'),
      });
    } finally {
      setPendingOrderDraft(null);
      setLoading(false);
    }
  };

  if (isBootstrapping) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme['background-basic-color-2'] }]}
      >
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ChatMessageList messages={messages} isLoading={isLoading} />
        {pendingOrderDraft && (
          <ConfirmOrderCard
            draft={pendingOrderDraft}
            onConfirm={handleConfirmOrderDraft}
            onCancel={handleCancelOrderDraft}
            disabled={isLoading}
          />
        )}
        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          onSend={handleSend}
          disabled={isLoading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
