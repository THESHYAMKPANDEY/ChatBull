import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface AppHeaderProps {
  title: string;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
}

export default function AppHeader({ title, rightIcon, onRightPress }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rightIcon: {
    padding: 8,
  },
});
