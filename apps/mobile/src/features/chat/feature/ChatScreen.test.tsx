import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Input } from '@ui-kitten/components';
import { OrderStatus, RoleName } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { useSessionStore } from '../../session/state/useSessionStore';
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
}));

import { consultarPedidosPorCliente } from '../data-access/mcpClient';

const authenticatedState = {
  isAuthenticated: true,
  user: {
    id: 'user-1',
    fullName: 'Cliente de Prueba',
    email: 'test@example.com',
    role: RoleName.CUSTOMER,
  },
  accessToken: 'token-123',
  refreshToken: 'refresh-123',
  authStatus: 'idle' as const,
  authError: null,
};

beforeEach(() => {
  useSessionStore.setState({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    authStatus: 'idle',
    authError: null,
  });
  useChatStore.setState({ messages: [], isLoading: false });
  jest.clearAllMocks();
});

test('shows a signed-out message instead of the chat UI when not authenticated', () => {
  const utils = renderWithProviders(<ChatScreen />);

  expect(utils.getByTestId('chat-signed-out-message')).toBeTruthy();
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
