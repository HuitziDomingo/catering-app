import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Input, Spinner, Text } from '@ui-kitten/components';
import { styles } from './RegisterForm.styles';

export type RegisterFormValue = {
  fullName: string;
  email: string;
  password: string;
  phone: string | null;
};

type RegisterFormProps = {
  pending?: boolean;
  error?: string | null;
  onSubmit: (value: RegisterFormValue) => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FULL_NAME_MAX_LENGTH = 150;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const PHONE_MAX_LENGTH = 30;

/**
 * Componente de presentación pura (sin lógica de negocio), vive en ui/ según
 * ADR-020. Validaciones alineadas con RegisterDto en la API (fullName
 * maxLength 150, email maxLength 255, password 8-72) -- mismas reglas que
 * register-form.ts en dashboard.
 */
export const RegisterForm = ({ pending = false, error = null, onSubmit }: RegisterFormProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, phone: false });

  const fullNameInvalid = fullName.trim().length === 0 || fullName.length > FULL_NAME_MAX_LENGTH;
  const emailInvalid = !EMAIL_PATTERN.test(email.trim()) || email.length > 255;
  const passwordInvalid = password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH;
  const phoneInvalid = phone.length > PHONE_MAX_LENGTH;

  const fullNameError = touched.fullName && fullNameInvalid ? 'El nombre completo es obligatorio.' : undefined;
  const emailError = touched.email && emailInvalid ? 'Ingresa un email válido.' : undefined;
  const passwordError =
    touched.password && passwordInvalid ? 'La contraseña debe tener al menos 8 caracteres.' : undefined;
  const phoneError = touched.phone && phoneInvalid ? 'El teléfono es demasiado largo.' : undefined;

  const handleSubmit = () => {
    setTouched({ fullName: true, email: true, password: true, phone: true });
    if (fullNameInvalid || emailInvalid || passwordInvalid || phoneInvalid) {
      return;
    }
    onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim() || null,
    });
  };

  return (
    <View style={styles.form}>
      {error ? (
        <Text status="danger" style={styles.formError} testID="register-error">
          {error}
        </Text>
      ) : null}

      <Input
        testID="register-full-name-input"
        label="Nombre completo"
        autoComplete="name"
        value={fullName}
        onChangeText={setFullName}
        onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
        status={fullNameError ? 'danger' : 'basic'}
        caption={fullNameError}
        style={styles.field}
      />

      <Input
        testID="register-email-input"
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
        testID="register-password-input"
        label="Contraseña"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        value={password}
        onChangeText={setPassword}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        status={passwordError ? 'danger' : 'basic'}
        caption={passwordError}
        style={styles.field}
      />

      <Input
        testID="register-phone-input"
        label="Teléfono (opcional)"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
        onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
        status={phoneError ? 'danger' : 'basic'}
        caption={phoneError}
        style={styles.field}
      />

      <Button
        testID="register-submit-button"
        style={styles.submitButton}
        disabled={pending}
        accessoryLeft={pending ? (evaProps) => <Spinner {...evaProps} size="small" /> : undefined}
        onPress={handleSubmit}
      >
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </View>
  );
};

export default RegisterForm;
