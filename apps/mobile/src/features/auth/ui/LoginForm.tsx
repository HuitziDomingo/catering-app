import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Input, Spinner, Text } from '@ui-kitten/components';
import { styles } from './LoginForm.styles';

export type LoginFormValue = {
  email: string;
  password: string;
};

type LoginFormProps = {
  pending?: boolean;
  error?: string | null;
  onSubmit: (value: LoginFormValue) => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Componente de presentación pura (sin lógica de negocio), vive en ui/ según
 * ADR-020. El feature/ (LoginScreen) decide qué hacer con el valor emitido y
 * le pasa de vuelta pending/error. Sin librería de formularios (no hay una
 * instalada en mobile todavía) -- validación manual con useState, mismas
 * reglas que login-form.ts en dashboard.
 */
export const LoginForm = ({ pending = false, error = null, onSubmit }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailInvalid = !EMAIL_PATTERN.test(email.trim());
  const passwordInvalid = password.length === 0;
  const emailError = touched.email && emailInvalid ? 'Ingresa un email válido.' : undefined;
  const passwordError = touched.password && passwordInvalid ? 'La contraseña es obligatoria.' : undefined;

  const handleSubmit = () => {
    setTouched({ email: true, password: true });
    if (emailInvalid || passwordInvalid) {
      return;
    }
    onSubmit({ email: email.trim(), password });
  };

  return (
    <View style={styles.form}>
      {error ? (
        <Text status="danger" style={styles.formError} testID="login-error">
          {error}
        </Text>
      ) : null}

      <Input
        testID="login-email-input"
        label="Email"
        placeholder="tu@email.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        status={emailError ? 'danger' : 'basic'}
        caption={emailError}
        style={styles.field}
      />

      <Input
        testID="login-password-input"
        label="Contraseña"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        status={passwordError ? 'danger' : 'basic'}
        caption={passwordError}
        style={styles.field}
      />

      <Button
        testID="login-submit-button"
        style={styles.submitButton}
        disabled={pending}
        accessoryLeft={pending ? (evaProps) => <Spinner {...evaProps} size="small" /> : undefined}
        onPress={handleSubmit}
      >
        {pending ? 'Entrando…' : 'Iniciar sesión'}
      </Button>
    </View>
  );
};

export default LoginForm;
