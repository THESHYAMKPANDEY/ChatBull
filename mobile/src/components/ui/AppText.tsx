import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../config/theme';

interface AppTextProps extends TextProps {
  children: React.ReactNode;
  variant?: 'caption' | 'captionStrong' | 'body' | 'title';
  color?: string;
}

const AppText: React.FC<AppTextProps> = ({ children, style, variant, color, ...props }) => {
  const { colors } = useTheme();
  
  let variantStyle = {};
  if (variant === 'caption' || variant === 'captionStrong') {
    variantStyle = { fontSize: 12 };
  }
  if (variant === 'captionStrong') {
    variantStyle = { ...variantStyle, fontWeight: 'bold' };
  }

  return (
    <Text style={[{ color: color || colors.text }, styles.text, variantStyle, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
  },
});

export default AppText;
