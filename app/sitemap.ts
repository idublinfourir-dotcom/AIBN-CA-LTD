import type { MetadataRoute } from "next";
import { serviceCategories, site } from "./lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/services",
    "/personal/mortgage",
    "/personal/investment",
    "/tools/ireland-income-tax",
    "/tools/ireland-vat",
    "/tools/ireland-corporation-tax",
    "/tools/ireland-rd-tax-credit",
    "/tools/ireland-capital-allowances",
    "/tools/ireland-cgt",
    "/tools/ireland-cat",
    "/toolkits",
    "/about",
    "/contact",
  ].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const servicePages = serviceCategories.flatMap((category) => [
    {
      url: `${site.url}/services/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    ...category.items.map((item) => ({
      url: `${site.url}/services/${category.slug}/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]);

  return [...staticPages, ...servicePages];
}
