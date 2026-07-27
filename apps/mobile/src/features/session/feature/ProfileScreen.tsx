import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from '@ui-kitten/components';
import { useSessionStore } from '../state/useSessionStore';
import { ProfileCard } from '../ui/ProfileCard';

// Pantalla del feature de sesión (ver ADR-020). useSessionStore es
// andamiaje temporal hasta que exista login real (ver ese archivo), así que
// el botón de alternar autenticación de abajo es SOLO PARA DESARROLLO: se
// elimina por completo cuando se construyan las pantallas de login.
export const ProfileScreen = () => {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const user = useSessionStore((state) => state.user);
  const devLogin = useSessionStore((state) => state.devLogin);
  const devLogout = useSessionStore((state) => state.devLogout);
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <Text category="h5" style={styles.title}>
        Perfil
      </Text>

      {isAuthenticated && user ? (
        <ProfileCard user={user} />
      ) : (
        <Text appearance="hint" style={styles.message} testID="profile-signed-out-message">
          Inicia sesión para ver tu perfil.
        </Text>
      )}

      {/* Andamiaje temporal solo para desarrollo (ver useSessionStore.ts) --
          reemplazar por las pantallas de login/logout reales. */}
      <View style={styles.devToggle}>
        <Button
          testID="profile-dev-auth-toggle"
          appearance="outline"
          status="basic"
          onPress={isAuthenticated ? devLogout : devLogin}
        >
          {isAuthenticated ? 'Dev: cerrar sesión' : 'Dev: iniciar sesión'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  message: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  devToggle: {
    marginTop: 'auto',
    padding: 16,
  },
});
