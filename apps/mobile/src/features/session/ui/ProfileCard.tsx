import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@ui-kitten/components';
import { RoleName } from '@catering-app/shared-types';
import type { SessionUser } from '../state/useSessionStore';

type ProfileCardProps = {
  user: SessionUser;
};

const ROLE_LABELS: Record<RoleName, string> = {
  [RoleName.CUSTOMER]: 'Cliente',
  [RoleName.STAFF]: 'Staff',
  [RoleName.ADMIN]: 'Administrador',
  [RoleName.SUPERADMIN]: 'Superadministrador',
};

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. Recibe el usuario ya resuelto desde el store de sesión.
export const ProfileCard = ({ user }: ProfileCardProps) => {
  const theme = useTheme();

  return (
    <View
      testID="profile-card"
      style={[styles.card, { backgroundColor: theme['background-basic-color-1'] }]}
    >
      <Text category="h6">{user.fullName}</Text>
      <Text appearance="hint" category="p2" style={styles.row}>
        {user.email}
      </Text>
      <Text category="s1" status="primary" style={styles.row} testID="profile-card-role">
        {ROLE_LABELS[user.role]}
      </Text>
    </View>
  );
};

export default ProfileCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  row: {
    marginTop: 4,
  },
});
