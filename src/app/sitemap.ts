import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://datematch-iota.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly",
  ) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("/", 1, "weekly"),
    page("/faq", 0.8),
    page("/pogoji", 0.5, "yearly"),
    page("/zasebnost", 0.5, "yearly"),
    page("/piskotki", 0.3, "yearly"),
    page("/vracila", 0.5, "yearly"),
    page("/sign-up", 0.7),
    page("/sign-in", 0.4),
  ];
}
