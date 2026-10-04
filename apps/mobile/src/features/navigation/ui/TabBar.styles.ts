import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  blur: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  navigation: {
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
