import React from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../../config/theme';
import { radii, spacing } from '../../config/tokens';
import AppText from './AppText';

export type AppTextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

const AppTextField = React.forwardRef<TextInput, AppTextFieldProps>(function AppTextField(
  { label, error, style, onKeyPress, onSubmitEditing, multiline, ...props }: AppTextFieldProps,
  ref
) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="captionStrong" style={{ marginBottom: spacing[1] }}>
          {label}
        </AppText>
      ) : null}
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
            backgroundColor: colors.card,
            borderColor: error ? colors.danger : colors.border,
          },
          style,
        ]}
      />
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
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 16,
  },
});
