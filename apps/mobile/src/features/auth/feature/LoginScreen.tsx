import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../state/useSessionStore';
import { extractErrorMessage } from '../../../core/http/extractErrorMessage';
import { LoginForm, type LoginFormValue } from '../ui/LoginForm';
import { styles } from './LoginScreen.styles';

/**
 * Pantalla real de login (ver ADR-020): conecta ui/LoginForm con
 * state/useSessionStore. Se usa tanto como ruta propia (app/login.tsx) como
 * embebida dentro de los tabs Chat/Perfil cuando no hay sesión (ver
 * ChatScreen.tsx, ProfileScreen.tsx) -- no depende de ser la ruta actual.
 */
export const LoginScreen = () => {
  const login = useSessionStore((state) => state.login);
  const theme = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: LoginFormValue) => {
    setPending(true);
    setError(null);
    try {
      await login(value);
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
          Catering
        </Text>
        <Text category="s1" appearance="hint" style={styles.subtitle}>
          Inicia sesión para continuar
        </Text>

        <LoginForm pending={pending} error={error} onSubmit={handleSubmit} />

        <View style={styles.footer}>
          <Text appearance="hint">¿No tienes cuenta?</Text>
          <Pressable testID="register-link" onPress={() => router.push('/register')}>
            <Text status="primary" style={styles.footerLink}>
              Crea una aquí
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
