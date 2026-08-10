import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../state/useSessionStore';
import { extractErrorMessage } from '../../../core/http/extractErrorMessage';
import { RegisterForm, type RegisterFormValue } from '../ui/RegisterForm';
import { styles } from './RegisterScreen.styles';

/**
 * Pantalla real de registro (ver ADR-020): conecta ui/RegisterForm con
 * state/useSessionStore. /auth/register ya devuelve tokens (igual que
 * /auth/login), así que registrarse deja al usuario con sesión iniciada.
 */
export const RegisterScreen = () => {
  const register = useSessionStore((state) => state.register);
  const theme = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: RegisterFormValue) => {
    setPending(true);
    setError(null);
    try {
      await register(value);
      router.replace('/menu');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text category="h4" style={styles.title}>
          Crear cuenta
        </Text>
        <Text category="s1" appearance="hint" style={styles.subtitle}>
          Regístrate para pedir con Catering
        </Text>

        <RegisterForm pending={pending} error={error} onSubmit={handleSubmit} />

        <View style={styles.footer}>
          <Text appearance="hint">¿Ya tienes cuenta?</Text>
          <Pressable testID="login-link" onPress={() => router.push('/login')}>
            <Text status="primary" style={styles.footerLink}>
              Inicia sesión
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
