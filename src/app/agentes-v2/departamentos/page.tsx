import { redirect } from "next/navigation";

// Los departamentos se listan en el Panel; esta ruta solo evita un 404 al recortar la URL.
export default function DepartamentosIndex() {
  redirect("/agentes-v2");
}
