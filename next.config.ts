import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite compilar en un directorio aparte sin pisar el `.next` que está
  // usando el servidor de desarrollo:
  //   NEXT_BUILD_DIR=.next-build npm run build
  // Lanzar `next build` contra el `.next` de un `next dev` activo deja al
  // servidor sirviendo 500 hasta que se borra el directorio y se reinicia.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
};

export default nextConfig;
