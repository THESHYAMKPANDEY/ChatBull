import React from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../../config/theme';
import { radii, spacing } from '../../config/tokens';
import AppText from './AppText';

export type AppTextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  hint?: string;
};

const AppTextField = React.forwardRef<TextInput, AppTextFieldProps>(function AppTextField(
  { label, error, style, onKeyPress, onSubmitEditing, multiline, leftIcon, rightIcon, containerStyle, hint, ...props }: AppTextFieldProps,
  ref
) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <AppText variant="captionStrong" style={{ marginBottom: spacing[1] }}>
          {label}
        </AppText>
      ) : null}
      <View style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.danger : colors.border,
          }
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          {...props}
          multiline={multiline}
          placeholderTextColor={colors.mutedText}
          onSubmitEditing={onSubmitEditing}
          onKeyPress={(e) => {
            onKeyPress?.(e);
            if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !multiline) {
              (onSubmitEditing as any)?.({ nativeEvent: { text: (props as any)?.value ?? '' } });
            }
          }}
          style={[
            styles.input,
            {
              color: colors.text,
            },
            style,
          ]}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {hint && !error ? (
        <AppText variant="caption" style={{ marginTop: spacing[1] }} color={colors.mutedText}>
          {hint}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" style={{ marginTop: spacing[1] }} color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

export default AppTextField;

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
  },
  leftIcon: {
    marginRight: spacing[2],
  },
  rightIcon: {
    marginLeft: spacing[2],
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: 16,
  },
});
