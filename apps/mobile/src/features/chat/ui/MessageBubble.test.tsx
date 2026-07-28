import * as React from 'react';
import { renderWithProviders } from '../../../test-utils';
import { MessageBubble } from './MessageBubble';

test('renders the message text', () => {
  const { getByText } = renderWithProviders(
    <MessageBubble
      message={{ id: '1', role: 'user', text: 'Hola', timestamp: '2026-01-01T00:00:00.000Z' }}
    />,
  );

  expect(getByText('Hola')).toBeTruthy();
});
