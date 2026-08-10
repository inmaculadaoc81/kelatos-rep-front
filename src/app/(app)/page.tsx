import { redirect } from "next/navigation";

// El dashboard vive ahora arriba de /reparaciones (ver dashboard-metricas.tsx),
// igual que en el sistema original: vistaActivas es una sola vista con las
// métricas y la tabla juntas, no dos rutas separadas.
export default function RaizPage() {
  redirect("/reparaciones");
}
