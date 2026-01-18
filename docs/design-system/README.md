# ChatBull Design System

## Goals
- Consistent cross-platform UI that stays fast and accessible.
- Platform-appropriate behavior (Android: Material; iOS: HIG; Web: WCAG).
- Token-driven styling with minimal one-off styles in screens.

## Tokens
- Colors: semantic tokens from `mobile/src/ui/tokens.ts`
- Spacing/Radii: `mobile/src/ui/tokens.ts`
- Typography scale: `mobile/src/ui/typography.ts`
- Motion tokens: `mobile/src/ui/motion.ts`

## Theming
- Provider: `mobile/src/config/theme.tsx`
- Supports OS sync via `useSystemTheme`
- Supports light/dark variants

## Components (UI Kit)
- `AppText`
- `AppPressable`
- `AppButton`
- `AppTextField`
- `AppCard`
- `AppScreen`

## Platform Guidance
### Android (Material)
- Touch targets: minimum 48dp
- Ripple feedback for presses
- Elevation only on surfaces that need hierarchy

### iOS (HIG)
- Clear hierarchy, large titles where appropriate
- Prefer sheet-like flows for modals

### Web (WCAG)
- Keyboard focus visibility and logical tab order
- Reduced motion support
- Responsive layouts

