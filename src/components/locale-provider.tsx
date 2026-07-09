"use client";

import { createContext, useContext } from "react";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";

const LocaleContext = createContext<{ t: Dict; locale: Locale } | null>(null);

export function LocaleProvider({
  dict,
  locale,
  children,
}: {
  dict: Dict;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ t: dict, locale }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Dictionary access for client components. */
export function useDict(): { t: Dict; locale: Locale } {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useDict must be used inside LocaleProvider");
  return ctx;
}
