"use client";

import DepartamentoPage from "../../agentes-v2/departamentos/[key]/page";

// Una sola promesa estable: `use()` dentro de DepartamentoPage no puede recibir una nueva en cada render.
const PARAMS = Promise.resolve({ key: "social_media" });

/** Departamento «Redes sociales» de la organización elegida (resumen, carruseles, temas, estrategia y horario). */
export default function RedesDepartamentoPage() {
  return <DepartamentoPage params={PARAMS} />;
}
