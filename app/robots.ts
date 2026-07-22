import type { MetadataRoute } from "next";

const BASE_URL = "https://edem30.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/eadmin30", "/api/", "/profile", "/create-trip", "/trip/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
