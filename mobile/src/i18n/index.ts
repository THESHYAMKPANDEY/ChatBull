import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './en';

const i18n = new I18n({ en });
i18n.enableFallback = true;
i18n.locale = Localization.getLocales()[0]?.languageTag ?? 'en';

export default i18n;

export type TranslationKey = keyof typeof en;

export const t = (key: TranslationKey, options?: Record<string, any>) =>
  i18n.t(key, options) as string;
