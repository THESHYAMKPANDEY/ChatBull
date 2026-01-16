import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VerifiedBadgeProps {
  size?: number;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16 }) => {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.check, { fontSize: size * 0.7 }]}>✓</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFD700', // Gold color
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  check: {
    color: '#000',
    fontWeight: 'bold',
  },
});
