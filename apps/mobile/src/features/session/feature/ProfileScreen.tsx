import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Spinner, Text, useTheme } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../../auth/state/useSessionStore';
import { LoginScreen } from '../../auth/feature/LoginScreen';
import { ProfileCard } from '../ui/ProfileCard';

// Pantalla del feature de sesión (ver ADR-020). Reemplaza por completo al
// toggle de desarrollo anterior: sin sesión, embebe LoginScreen (mismo
// componente que la ruta app/login.tsx, ver ADR-020) en vez de solo un
// mensaje; con sesión, muestra el perfil real y un logout real que limpia
// el estado de useSessionStore y manda a /login.
export const ProfileScreen = () => {
  const isBootstrapping = useSessionStore((state) => state.isBootstrapping);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);
  const theme = useTheme();
  const router = useRouter();

  if (isBootstrapping) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme['background-basic-color-2'] }]}
      >
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <Text category="h5" style={styles.title}>
        Perfil
      </Text>

      <ProfileCard user={user} />

      <View style={styles.logout}>
        <Button testID="logout-button" appearance="outline" status="danger" onPress={handleLogout}>
          Cerrar sesión
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logout: {
    marginTop: 'auto',
    padding: 16,
  },
});
