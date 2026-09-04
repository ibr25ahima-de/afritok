import { useLanguage } from "@/contexts/LanguageContext";
import { getSettingsText } from "@/i18n/settingsTranslations";

export function useSettingsText() {
  const { language } = useLanguage();
  return (key: string, fallback: string) => getSettingsText(language, key, fallback);
}
