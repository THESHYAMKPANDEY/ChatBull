import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../config/theme';

export interface AppHeaderProps {
  title: string;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
}

export default function AppHeader({ title, rightIcon, onRightPress }: AppHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {rightIcon && (
        <TouchableOpacity onPress={onRightPress} style={styles.rightIcon}>
          {rightIcon}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  rightIcon: {
    padding: 8,
  },
});
