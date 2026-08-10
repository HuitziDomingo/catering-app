import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Input } from '@ui-kitten/components';
import { OrderStatus, RoleName, type MenuItem } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { useSessionStore } from '../../auth/state/useSessionStore';
import { useMenuStore } from '../../menu/state/useMenuStore';
import { useChatStore } from '../state/useChatStore';
import { ChatScreen } from './ChatScreen';

// UI Kitten namespacea el testID de Input en subelementos internos
// (@chat-input/input, @chat-input/container) en vez de aplicarlo tal cual --
// mismo caso que Toggle en ThemeToggle.test.tsx, mismo workaround
// (UNSAFE_getByType en vez de getByTestId para ese control puntual).
function typeMessage(utils: ReturnType<typeof renderWithProviders>, text: string) {
  fireEvent.changeText(utils.UNSAFE_getByType(Input), text);
}

jest.mock('../data-access/mcpClient', () => ({
  consultarPedidosPorCliente: jest.fn(),
  crearPedido: jest.fn(),
}));

// ChatScreen embeds LoginScreen (useRouter) when signed out -- a stub router
// is enough here, navigation itself is out of scope for this test file (see
// same pattern in MenuScreen.test.tsx).
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

import { consultarPedidosPorCliente, crearPedido } from '../data-access/mcpClient';

const authenticatedState = {
  isBootstrapping: false,
  isAuthenticated: true,
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: RoleName.CUSTOMER,
  },
  accessToken: 'token-123',
  refreshToken: 'refresh-123',
  authStatus: 'idle' as const,
  authError: null,
};

const chilaquiles: MenuItem = {
  id: 'menu-item-chilaquiles',
  categoryId: 'cat-1',
  name: 'Chilaquiles',
  description: null,
  basePrice: 45,
  servesMin: 300,
  servesMax: 500,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  useSessionStore.setState({
    isBootstrapping: false,
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    authStatus: 'idle',
    authError: null,
  });
  useChatStore.setState({ messages: [], isLoading: false, pendingOrderDraft: null });
  // status: 'success' evita que ChatScreen dispare un load() real (fetch) al
  // montar -- los items del menú ya están "cargados" para estos tests.
  useMenuStore.setState({
    categories: [],
    items: [chilaquiles],
    selectedCategoryId: null,
    status: 'success',
    error: null,
  });
  jest.clearAllMocks();
});

test('renders the login screen instead of the chat UI when not authenticated', () => {
  const utils = renderWithProviders(<ChatScreen />);

  expect(utils.getByTestId('login-submit-button')).toBeTruthy();
  expect(utils.queryByTestId('chat-send-button')).toBeNull();
});

test('replies with the fallback message when the text is not order-related', async () => {
  useSessionStore.setState(authenticatedState);
  const utils = renderWithProviders(<ChatScreen />);

  typeMessage(utils, 'hola, ¿qué tal?');
  fireEvent.press(utils.getByTestId('chat-send-button'));

  await waitFor(() =>
    expect(
      utils.getByText(/Puedo ayudarte a consultar tus pedidos/),
    ).toBeTruthy(),
  );
  expect(consultarPedidosPorCliente).not.toHaveBeenCalled();
  expect(crearPedido).not.toHaveBeenCalled();
});

test('calls the MCP tool and renders the real order data when the message is order-related', async () => {
  useSessionStore.setState(authenticatedState);
  (consultarPedidosPorCliente as jest.Mock).mockResolvedValue({
    success: true,
    count: 1,
    data: [
      {
        id: 'order-1',
        status: OrderStatus.PENDING,
        peopleCount: 10,
        scheduledFor: '2026-08-01T12:00:00.000Z',
        subtotal: 500,
        total: 550,
        notes: null,
        createdAt: '2026-07-20T10:00:00.000Z',
      },
    ],
  });

  const utils = renderWithProviders(<ChatScreen />);

  typeMessage(utils, '¿cuáles son mis pedidos?');
  fireEvent.press(utils.getByTestId('chat-send-button'));

  await waitFor(() =>
    expect(utils.getByText(/Aquí están tus pedidos recientes/)).toBeTruthy(),
  );
  expect(consultarPedidosPorCliente).toHaveBeenCalledWith('token-123');
  expect(utils.getByText(/Pendiente/)).toBeTruthy();
});

test('shows an error reply when the MCP call fails', async () => {
  useSessionStore.setState(authenticatedState);
  (consultarPedidosPorCliente as jest.Mock).mockRejectedValue(new Error('Network down'));

  const utils = renderWithProviders(<ChatScreen />);

  typeMessage(utils, 'mis pedidos por favor');
  fireEvent.press(utils.getByTestId('chat-send-button'));

  await waitFor(() =>
    expect(utils.getByText(/No pude consultar tus pedidos/)).toBeTruthy(),
  );
});

describe('crear_pedido confirmation flow (ADR-023)', () => {
  test('shows a confirmation card (no tool call yet) when extraction succeeds', async () => {
    useSessionStore.setState(authenticatedState);
    const utils = renderWithProviders(<ChatScreen />);

    typeMessage(
      utils,
      'puedes pedirme una orden de catering de chilaquiles para 400 personas en 4 dias para el desayuno',
    );
    fireEvent.press(utils.getByTestId('chat-send-button'));

    await waitFor(() => expect(utils.getByTestId('confirm-order-card')).toBeTruthy());
    expect(utils.getByText(/Confirmar pedido: Chilaquiles para 400 personas/)).toBeTruthy();
    expect(crearPedido).not.toHaveBeenCalled();
  });

  test('confirming the card calls crear_pedido with the extracted data and reports success', async () => {
    // Fecha de sistema fija para que "en 4 dias" sea determinístico. El
    // valor esperado se construye con la misma aritmética local que usa
    // extractOrderIntent (ver extractOrderIntent.test.ts) para no depender
    // de la zona horaria de la máquina/CI que corre el test.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T08:00:00.000Z'));
    const expectedScheduledFor = new Date('2026-07-31T08:00:00.000Z');
    expectedScheduledFor.setDate(expectedScheduledFor.getDate() + 4);
    expectedScheduledFor.setHours(9, 0, 0, 0);

    useSessionStore.setState(authenticatedState);
    (crearPedido as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'order-999',
        status: OrderStatus.PENDING,
        peopleCount: 400,
        scheduledFor: expectedScheduledFor.toISOString(),
        subtotal: 45,
        total: 45,
        notes: null,
        needsReview: false,
        createdAt: '2026-07-31T08:00:00.000Z',
      },
    });

    const utils = renderWithProviders(<ChatScreen />);

    try {
      typeMessage(
        utils,
        'puedes pedirme una orden de catering de chilaquiles para 400 personas en 4 dias para el desayuno',
      );
      fireEvent.press(utils.getByTestId('chat-send-button'));
      await waitFor(() => expect(utils.getByTestId('confirm-order-card')).toBeTruthy());

      fireEvent.press(utils.getByTestId('confirm-order-confirm-button'));

      await waitFor(() => expect(utils.getByText(/folio order-999/)).toBeTruthy());
      expect(crearPedido).toHaveBeenCalledWith('token-123', {
        items: [{ menuItemId: 'menu-item-chilaquiles', quantity: 1 }],
        peopleCount: 400,
        scheduledFor: expectedScheduledFor.toISOString(),
      });
      expect(utils.queryByTestId('confirm-order-card')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('surfaces the needsReview flag in the confirmation reply', async () => {
    useSessionStore.setState(authenticatedState);
    (crearPedido as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'order-999',
        status: OrderStatus.PENDING,
        peopleCount: 5,
        scheduledFor: '2026-08-04T09:00:00.000Z',
        subtotal: 45,
        total: 45,
        notes: null,
        needsReview: true,
        createdAt: '2026-07-31T08:00:00.000Z',
      },
    });

    const utils = renderWithProviders(<ChatScreen />);

    typeMessage(utils, 'quiero pedir chilaquiles para 5 personas mañana');
    fireEvent.press(utils.getByTestId('chat-send-button'));
    await waitFor(() => expect(utils.getByTestId('confirm-order-card')).toBeTruthy());

    fireEvent.press(utils.getByTestId('confirm-order-confirm-button'));

    await waitFor(() => expect(utils.getByText(/quedó marcado para revisión/)).toBeTruthy());
  });

  test('canceling the card clears the draft without calling crear_pedido', async () => {
    useSessionStore.setState(authenticatedState);
    const utils = renderWithProviders(<ChatScreen />);

    typeMessage(utils, 'quiero pedir chilaquiles para 400 personas mañana');
    fireEvent.press(utils.getByTestId('chat-send-button'));
    await waitFor(() => expect(utils.getByTestId('confirm-order-card')).toBeTruthy());

    fireEvent.press(utils.getByTestId('confirm-order-cancel-button'));

    await waitFor(() => expect(utils.getByText(/Cancelé ese pedido/)).toBeTruthy());
    expect(crearPedido).not.toHaveBeenCalled();
    expect(utils.queryByTestId('confirm-order-card')).toBeNull();
  });

  test('asks for clarification instead of guessing when the dish cannot be matched', async () => {
    useSessionStore.setState(authenticatedState);
    const utils = renderWithProviders(<ChatScreen />);

    typeMessage(utils, 'quiero pedir tacos para 400 personas mañana');
    fireEvent.press(utils.getByTestId('chat-send-button'));

    await waitFor(() => expect(utils.getByText(/No reconocí ese platillo/)).toBeTruthy());
    expect(utils.queryByTestId('confirm-order-card')).toBeNull();
    expect(crearPedido).not.toHaveBeenCalled();
  });

  test('asks for clarification instead of guessing when there is no clear date', async () => {
    useSessionStore.setState(authenticatedState);
    const utils = renderWithProviders(<ChatScreen />);

    typeMessage(utils, 'quiero pedir chilaquiles para 400 personas');
    fireEvent.press(utils.getByTestId('chat-send-button'));

    await waitFor(() => expect(utils.getByText(/¿Para qué fecha/)).toBeTruthy());
    expect(utils.queryByTestId('confirm-order-card')).toBeNull();
  });
});
