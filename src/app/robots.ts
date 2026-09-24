import type { MetadataRoute } from "next";

/** Nada de esta aplicación debe indexarse: es un panel interno y formularios de un solo uso. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
