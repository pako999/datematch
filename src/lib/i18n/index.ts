import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  getDictionary,
  type Dict,
  type Locale,
} from "./dictionaries";

export const LOCALE_COOKIE = "locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

export async function getI18n(): Promise<{ t: Dict; locale: Locale }> {
  const locale = await getLocale();
  return { t: getDictionary(locale), locale };
}
