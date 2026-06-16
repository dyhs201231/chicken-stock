import type { MetadataRoute } from "next";
import { SITE_URL } from "./(frontend)/(route)/edu/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/my", "/portfolio", "/edu/quizzes"],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
