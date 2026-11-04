"use client";

import DepartamentoPage from "../../agentes-v2/departamentos/[key]/page";

const PARAMS = Promise.resolve({ key: "local_seo" });

/** Departamento «SEO local» de la organización elegida (palabras clave, artículos, estrategia y horario). */
export default function SeoLocalPage() {
  return <DepartamentoPage params={PARAMS} />;
}
