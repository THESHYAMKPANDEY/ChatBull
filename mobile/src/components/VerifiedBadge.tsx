import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface VerifiedBadgeProps {
  size?: number;
}

export const VerifiedBadge = ({ size = 16 }: VerifiedBadgeProps) => {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.checkmark, { fontSize: size * 0.6 }]}>✓</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0095f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
