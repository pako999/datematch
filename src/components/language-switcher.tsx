"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/dictionaries";
import { useDict } from "./locale-provider";
import { cn } from "./ui";

export function LanguageSwitcher({
  className,
  variant = "default",
}: {
  className?: string;
  /** "onDark" renders fixed light colors for use over dark imagery. */
  variant?: "default" | "onDark";
}) {
  const { locale } = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const btn = (l: Locale, label: string) => (
    <button
      type="button"
      disabled={pending}
      onClick={() => choose(l)}
      className={cn(
        "rounded px-1.5 py-0.5 text-xs",
        locale === l
          ? variant === "onDark"
            ? "bg-white font-semibold text-black"
            : "bg-foreground font-semibold text-background"
          : variant === "onDark"
            ? "text-white/70 hover:underline"
            : "text-muted-foreground hover:underline",
      )}
      aria-pressed={locale === l}
    >
      {label}
    </button>
  );

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {btn("sl", "SL")}
      {btn("en", "EN")}
    </span>
  );
}
