import * as React from 'react';
import { render } from '@testing-library/react-native';

import App from './App';

test('renders the mobile skeleton with the gluestack button', () => {
  const { getByText, getByTestId } = render(<App />);
  expect(getByTestId('heading')).toHaveTextContent(/Catering/);
  expect(getByText('Probar gluestack')).toBeTruthy();
});
