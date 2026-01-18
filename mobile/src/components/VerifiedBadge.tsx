import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../config/theme';

interface VerifiedBadgeProps {
  size?: number;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16 }) => {
  const { colors } = useTheme();
  return <Ionicons name="checkmark-circle" size={size} color={colors.primary} />;
};

export default VerifiedBadge;
